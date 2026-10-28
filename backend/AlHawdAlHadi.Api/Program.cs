using AlHawdAlHadi.Api.Data;
using AlHawdAlHadi.Api.Infrastructure;
using AlHawdAlHadi.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.StaticFiles;
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
        sql => sql.EnableRetryOnFailure(maxRetryCount: 5))
    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

builder.Services.AddScoped<ICmsService, CmsService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IMediaService, MediaService>();
builder.Services.AddMemoryCache();

// High-speed response compression (Brotli + Gzip)
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});
builder.Services.Configure<BrotliCompressionProviderOptions>(options => options.Level = System.IO.Compression.CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(options => options.Level = System.IO.Compression.CompressionLevel.Fastest);

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
builder.Services.AddAdminAccess(builder.Configuration, builder.Environment);

builder.Services.AddCors(o => o.AddPolicy("Frontend", p =>
{
    if (frontendOptions.AllowedOrigins.Length > 0)
        p.WithOrigins(frontendOptions.AllowedOrigins).AllowAnyHeader().AllowAnyMethod();
}));

var app = builder.Build();

// ---------------------------------------------------------------------------
// Database migration + seed
// ---------------------------------------------------------------------------
try
{
    await DbInitializer.InitializeAsync(app.Services);
}
catch (Exception ex)
{
    var startupLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    startupLogger.LogError(ex, "Database initialization encountered an error on startup.");
}

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
app.UseAdminAccess();
app.UseResponseCompression();

var fileProvider = new PhysicalFileProvider(frontendRoot);
var contentTypeProvider = new FileExtensionContentTypeProvider();
contentTypeProvider.Mappings[".webp"] = "image/webp";
contentTypeProvider.Mappings[".svg"] = "image/svg+xml";

app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fileProvider });
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = fileProvider,
    ContentTypeProvider = contentTypeProvider,
    OnPrepareResponse = ctx =>
    {
        var name = ctx.File.Name.ToLowerInvariant();
        if (name.EndsWith(".webp") || name.EndsWith(".png") || name.EndsWith(".jpg") || name.EndsWith(".jpeg") || name.EndsWith(".svg") || name.EndsWith(".woff2"))
        {
            ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        }
        else if (name.EndsWith(".css") || name.EndsWith(".js"))
        {
            ctx.Context.Response.Headers.CacheControl = "public, max-age=86400, stale-while-revalidate=604800";
        }
        else
        {
            ctx.Context.Response.Headers.CacheControl = "no-cache";
        }
    }
});

app.MapControllers();

app.MapGet("/admin", () => Results.File(Path.Combine(frontendRoot, "admin.html"), "text/html; charset=utf-8"))
   .ExcludeFromDescription();

app.MapGet("/project", () => Results.File(Path.Combine(frontendRoot, "project.html"), "text/html; charset=utf-8"))
   .ExcludeFromDescription();

app.MapGet("/apartment", () => Results.File(Path.Combine(frontendRoot, "apartment.html"), "text/html; charset=utf-8"))
   .ExcludeFromDescription();

// Unknown /api/* routes → JSON 404; everything else → index.html
app.MapFallback("/api/{**path}", () => Results.NotFound(new { error = "المسار غير موجود" }));
app.MapFallback(() => Results.File(Path.Combine(frontendRoot, "index.html"), "text/html; charset=utf-8"));

app.Run();
