using AlHawdAlHadi.Api.Data;
using AlHawdAlHadi.Api.Infrastructure;
using AlHawdAlHadi.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Front-end (pure HTML / CSS / JS) location
// ---------------------------------------------------------------------------
var frontendOptions = builder.Configuration.GetSection(FrontendOptions.SectionName).Get<FrontendOptions>() ?? new FrontendOptions();
var frontendRoot = Path.GetFullPath(Path.IsPathRooted(frontendOptions.RootPath)
    ? frontendOptions.RootPath
    : Path.Combine(builder.Environment.ContentRootPath, frontendOptions.RootPath));
if (!Directory.Exists(frontendRoot))
    throw new DirectoryNotFoundException($"Front-end folder not found: {frontendRoot}");

var frontendPaths = new FrontendPaths(frontendRoot);
Directory.CreateDirectory(frontendPaths.UploadsDirectory);
builder.Services.AddSingleton(frontendPaths);

// ---------------------------------------------------------------------------
// Data: SQL Server + EF Core
// ---------------------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.EnableRetryOnFailure(maxRetryCount: 5)));

builder.Services.AddScoped<ICmsService, CmsService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IMediaService, MediaService>();

// ---------------------------------------------------------------------------
// Web API
// ---------------------------------------------------------------------------
builder.Services
    .AddControllers()
    .AddJsonOptions(o => JsonDefaults.Configure(o.JsonSerializerOptions));

// Return validation errors as { error: "..." } (shape expected by the front-end).
builder.Services.Configure<ApiBehaviorOptions>(o =>
{
    o.InvalidModelStateResponseFactory = ctx =>
    {
        var errors = ctx.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .ToDictionary(e => e.Key, e => e.Value!.Errors.Select(x => x.ErrorMessage).ToArray());
        var first = errors.Values.SelectMany(v => v).FirstOrDefault(m => !string.IsNullOrWhiteSpace(m)) ?? "بيانات غير صالحة";
        return new BadRequestObjectResult(new { error = first, errors });
    };
});

builder.WebHost.ConfigureKestrel(k => k.Limits.MaxRequestBodySize = 30 * 1024 * 1024);

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

builder.Services.AddCors(o => o.AddPolicy("Frontend", p =>
{
    if (frontendOptions.AllowedOrigins.Length > 0)
        p.WithOrigins(frontendOptions.AllowedOrigins).AllowAnyHeader().AllowAnyMethod();
}));

var app = builder.Build();

// ---------------------------------------------------------------------------
// Database migration + seed
// ---------------------------------------------------------------------------
await DbInitializer.InitializeAsync(app.Services);

// ---------------------------------------------------------------------------
// HTTP pipeline
// ---------------------------------------------------------------------------
app.UseExceptionHandler(errorApp => errorApp.Run(async ctx =>
{
    ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await ctx.Response.WriteAsJsonAsync(new { error = "حدث خطأ غير متوقع في الخادم" });
}));

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // /openapi/v1.json
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");

var fileProvider = new PhysicalFileProvider(frontendRoot);
app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fileProvider });
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = fileProvider,
    OnPrepareResponse = ctx =>
    {
        // Images are immutable-ish; HTML/CSS/JS are revalidated so CMS edits show instantly.
        var path = ctx.File.Name;
        ctx.Context.Response.Headers.CacheControl =
            path.EndsWith(".png") || path.EndsWith(".jpg") || path.EndsWith(".webp")
                ? "public, max-age=604800"
                : "no-cache";
    }
});

app.MapControllers();

app.MapGet("/admin", () => Results.File(Path.Combine(frontendRoot, "admin.html"), "text/html; charset=utf-8"))
   .ExcludeFromDescription();

app.MapGet("/project", () => Results.File(Path.Combine(frontendRoot, "project.html"), "text/html; charset=utf-8"))
   .ExcludeFromDescription();

// Unknown /api/* routes → JSON 404; everything else → index.html
app.MapFallback("/api/{**path}", () => Results.NotFound(new { error = "المسار غير موجود" }));
app.MapFallback(() => Results.File(Path.Combine(frontendRoot, "index.html"), "text/html; charset=utf-8"));

app.Run();
