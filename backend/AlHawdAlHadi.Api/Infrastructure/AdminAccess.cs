using System.Data;
using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.RateLimiting;
using AlHawdAlHadi.Api.Data;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace AlHawdAlHadi.Api.Infrastructure;

public sealed class AdminUserRecord
{
    public string Id { get; set; } = "";
    public string Username { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Role { get; set; } = "admin";
    public bool IsActive { get; set; } = true;
    public string PasswordHash { get; set; } = "";
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture);
}

public sealed class CreateAdminUserRequest
{
    public string? Username { get; set; }
    public string? DisplayName { get; set; }
    public string? Role { get; set; }
    public string? Password { get; set; }
}

public sealed class UpdateAdminUserRequest
{
    public string? Username { get; set; }
    public string? DisplayName { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
    public string? Password { get; set; }
}

public sealed class ChangePasswordRequest
{
    public string? UserId { get; set; }
    public string? Username { get; set; }
    public string? NewPassword { get; set; }
}

public static class AdminAccess
{
    private const string Scheme = "AdminCookie";
    private const int DefaultIterations = 210_000;
    private const string FallbackAdminHash = "210000:qS72XOKwOnW7lQxpmCcvrg==:fb6Zjlou94BhskQUwJboT/Am7eUOULUns4VKI6YIHM0=";

    private static readonly SemaphoreSlim UsersLock = new(1, 1);

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    public static void AddAdminAccess(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment env)
    {
        services.AddAntiforgery();
        services.AddAuthentication(Scheme).AddCookie(Scheme, options =>
        {
            options.Cookie.Name = "AlHawd.Admin";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = env.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = true;
        });
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy("admin-login", context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
        });
    }

    public static void UseAdminAccess(this WebApplication app)
    {
        var enabled = app.Configuration.GetValue("Admin:Enabled", !app.Environment.IsDevelopment());
        app.UseAuthentication();
        app.UseRateLimiter();
        app.Use(async (context, next) =>
        {
            var path = (context.Request.Path.Value ?? "/").Replace('\\', '/').TrimEnd('/');
            var api = path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase);
            var publicRead = HttpMethods.IsGet(context.Request.Method) && path.Equals("/api/cms", StringComparison.OrdinalIgnoreCase);
            var publicBooking = HttpMethods.IsPost(context.Request.Method) && path.Equals("/api/bookings", StringComparison.OrdinalIgnoreCase);
            var adminPage = path.Equals("/admin", StringComparison.OrdinalIgnoreCase) ||
                Path.GetFileName(path).Equals("admin.html", StringComparison.OrdinalIgnoreCase);
            if (enabled && (adminPage || (api && !publicRead && !publicBooking)))
            {
                if (context.User.Identity?.IsAuthenticated != true)
                {
                    context.Response.Headers.CacheControl = "no-store";
                    if (api)
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        await context.Response.WriteAsJsonAsync(new { error = "يرجى تسجيل الدخول إلى لوحة الإدارة" });
                    }
                    else context.Response.Redirect("/admin/login");
                    return;
                }

                if (!HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method))
                {
                    var origin = context.Request.Headers.Origin.ToString();
                    if (!string.IsNullOrEmpty(origin))
                    {
                        var validOrigin = Uri.TryCreate(origin, UriKind.Absolute, out var originUri) &&
                            string.Equals(originUri.Authority, context.Request.Host.Value, StringComparison.OrdinalIgnoreCase);
                        if (!validOrigin)
                        {
                            context.Response.StatusCode = StatusCodes.Status403Forbidden;
                            return;
                        }
                    }
                }
                context.Response.Headers.CacheControl = "no-store";
            }
            await next(context);
        });

        app.MapGet("/admin/login", (HttpContext context, IAntiforgery antiforgery) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            var tokens = antiforgery.GetAndStoreTokens(context);
            var errCode = context.Request.Query["error"].ToString();
            var error = errCode switch
            {
                "disabled" => "هذا الحساب موقوف حالياً، يرجى مراجعة مدير النظام.",
                "1" => "اسم المستخدم أو كلمة المرور غير صحيحة",
                _ => ""
            };
            var errorHtml = string.IsNullOrEmpty(error)
                ? ""
                : $"<div class=\"error-box\">{HtmlEncoder.Default.Encode(error)}</div>";

            var html = $$"""
                <!doctype html>
                <html lang="ar" dir="rtl">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width,initial-scale=1">
                  <title>تسجيل دخول الإدارة والموظفين | الحوض الهادي للإسكان</title>
                  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
                  <style>
                    * { box-sizing: border-box; }
                    body {
                      margin: 0;
                      min-height: 100vh;
                      display: grid;
                      place-items: center;
                      background: radial-gradient(circle at top, #1b2d34 0%, #0d171a 100%);
                      color: #f3eee1;
                      font-family: 'IBM Plex Sans Arabic', Tahoma, sans-serif;
                      padding: 20px;
                    }
                    main {
                      width: min(420px, 100%);
                      padding: 36px 32px;
                      background: rgba(24, 38, 44, 0.95);
                      border: 1px solid rgba(219, 197, 152, 0.22);
                      border-radius: 20px;
                      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
                    }
                    .brand-head {
                      display: flex;
                      align-items: center;
                      gap: 14px;
                      margin-bottom: 20px;
                    }
                    .brand-logo {
                      width: 48px;
                      height: 48px;
                      border-radius: 12px;
                      background: rgba(219, 197, 152, 0.1);
                      border: 1px solid rgba(219, 197, 152, 0.3);
                      display: grid;
                      place-items: center;
                    }
                    h1 { font-size: 1.4rem; margin: 0 0 4px; color: #f7f3eb; }
                    .sub { margin: 0; font-size: 0.88rem; color: #9ab0b8; }
                    label { display: block; margin: 18px 0 8px; font-size: 0.9rem; font-weight: 600; color: #dbc598; }
                    .input-wrap { position: relative; }
                    input {
                      width: 100%;
                      padding: 13px 14px;
                      background: #101c20;
                      color: #fff;
                      border: 1px solid #354a52;
                      border-radius: 10px;
                      font: inherit;
                      font-size: 0.95rem;
                      transition: border-color 0.2s;
                    }
                    input:focus { outline: none; border-color: #dbc598; }
                    .toggle-pw {
                      position: absolute;
                      left: 10px;
                      top: 50%;
                      transform: translateY(-50%);
                      background: transparent;
                      border: none;
                      color: #9ab0b8;
                      cursor: pointer;
                      padding: 4px 8px;
                      font-size: 0.82rem;
                      width: auto;
                      margin: 0;
                    }
                    button.submit-btn {
                      margin-top: 26px;
                      width: 100%;
                      padding: 14px;
                      background: linear-gradient(135deg, #e5c287 0%, #c69d59 100%);
                      color: #101c20;
                      font: inherit;
                      font-weight: 700;
                      font-size: 1rem;
                      border: none;
                      border-radius: 10px;
                      cursor: pointer;
                    }
                    button.submit-btn:hover { filter: brightness(1.06); }
                    .error-box {
                      background: rgba(220, 78, 78, 0.15);
                      border: 1px solid rgba(220, 78, 78, 0.4);
                      color: #ffb8b8;
                      padding: 12px 14px;
                      border-radius: 10px;
                      font-size: 0.9rem;
                      margin-bottom: 14px;
                    }
                    .back-link {
                      display: block;
                      text-align: center;
                      margin-top: 20px;
                      color: #dbc598;
                      text-decoration: none;
                      font-size: 0.9rem;
                    }
                  </style>
                </head>
                <body>
                  <main>
                    <div class="brand-head">
                      <div class="brand-logo">
                        <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
                          <path d="M34 6L50 15V56H34V6Z" fill="#E5C287"/>
                          <path d="M34 6L18 16V56H34V6Z" fill="#C69D59"/>
                          <path d="M12 28L24 21V56H12V28Z" fill="#9E7636"/>
                        </svg>
                      </div>
                      <div>
                        <h1>بوابة الإدارة والموظفين</h1>
                        <p class="sub">الحوض الهادي للإسكان — نظام إدارة المحتوى</p>
                      </div>
                    </div>
                    {{errorHtml}}
                    <form method="post" action="/admin/login">
                      <input type="hidden" name="{{HtmlEncoder.Default.Encode(tokens.FormFieldName)}}" value="{{HtmlEncoder.Default.Encode(tokens.RequestToken ?? "")}}">
                      <label for="username">اسم المستخدم</label>
                      <input id="username" name="username" dir="ltr" autocomplete="username" required maxlength="100" placeholder="admin">
                      <label for="password">كلمة المرور</label>
                      <div class="input-wrap">
                        <input id="password" name="password" dir="ltr" type="password" autocomplete="current-password" required maxlength="256" placeholder="••••••••">
                        <button type="button" class="toggle-pw" onclick="var p=document.getElementById('password');p.type=p.type==='password'?'text':'password';this.textContent=p.type==='password'?'إظهار':'إخفاء';">إظهار</button>
                      </div>
                      <button type="submit" class="submit-btn">تسجيل الدخول إلى اللوحة</button>
                    </form>
                    <a class="back-link" href="/">← العودة إلى الموقع الرئيسي</a>
                  </main>
                </body>
                </html>
                """;
            return Results.Content(html, "text/html; charset=utf-8");
        });

        app.MapPost("/admin/login", async (HttpContext context, IAntiforgery antiforgery) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            try { await antiforgery.ValidateRequestAsync(context); }
            catch (AntiforgeryValidationException) { return Results.BadRequest(); }

            var form = await context.Request.ReadFormAsync();
            var inputUser = form["username"].ToString().Trim();
            var inputPass = form["password"].ToString();

            if (string.IsNullOrWhiteSpace(inputUser) || string.IsNullOrEmpty(inputPass))
                return Results.Redirect("/admin/login?error=1");

            var users = await LoadUsersAsync(app);
            var matched = users.FirstOrDefault(u => string.Equals(u.Username, inputUser, StringComparison.OrdinalIgnoreCase));

            if (matched is null || !VerifyPassword(inputPass, matched.PasswordHash))
                return Results.Redirect("/admin/login?error=1");

            if (!matched.IsActive)
                return Results.Redirect("/admin/login?error=disabled");

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, matched.Id),
                new(ClaimTypes.Name, matched.Username),
                new(ClaimTypes.GivenName, matched.DisplayName),
                new(ClaimTypes.Role, matched.Role)
            };
            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme));
            await context.SignInAsync(Scheme, principal);
            return Results.Redirect("/admin");
        }).RequireRateLimiting("admin-login");

        app.MapPost("/admin/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(Scheme);
            return Results.Redirect("/admin/login");
        });

        app.MapGet("/admin/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(Scheme);
            return Results.Redirect("/admin/login");
        });

        // -------------------------------------------------------------------
        // Admin Users & Password Management REST API
        // -------------------------------------------------------------------
        app.MapGet("/api/admin/me", async (HttpContext context) =>
        {
            var users = await LoadUsersAsync(app);
            var currentUsername = context.User.Identity?.Name;
            var current = (!string.IsNullOrWhiteSpace(currentUsername)
                ? users.FirstOrDefault(u => string.Equals(u.Username, currentUsername, StringComparison.OrdinalIgnoreCase))
                : null) ?? users.FirstOrDefault() ?? new AdminUserRecord
                {
                    Id = "usr-admin",
                    Username = "admin",
                    DisplayName = "المدير العام",
                    Role = "admin"
                };

            return Results.Json(ToSafeDto(current));
        });

        app.MapGet("/api/admin/users", async () =>
        {
            var users = await LoadUsersAsync(app);
            return Results.Json(users.Select(ToSafeDto));
        });

        app.MapPost("/api/admin/users", async (CreateAdminUserRequest req) =>
        {
            var username = (req.Username ?? "").Trim();
            var displayName = (req.DisplayName ?? "").Trim();
            var role = NormalizeRole(req.Role);
            var password = req.Password ?? "";

            if (username.Length < 2 || username.Length > 60)
                return Results.BadRequest(new { error = "اسم المستخدم يجب أن يكون بين حرفين و 60 حرفاً" });

            if (password.Length < 4 || password.Length > 256)
                return Results.BadRequest(new { error = "كلمة المرور يجب أن تتكون من 4 خانات على الأقل" });

            if (string.IsNullOrWhiteSpace(displayName))
                displayName = username;

            await UsersLock.WaitAsync();
            try
            {
                var users = await LoadUsersAsync(app);
                if (users.Any(u => string.Equals(u.Username, username, StringComparison.OrdinalIgnoreCase)))
                    return Results.BadRequest(new { error = "اسم المستخدم هذا مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر" });

                var newUser = new AdminUserRecord
                {
                    Id = $"usr-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                    Username = username,
                    DisplayName = displayName,
                    Role = role,
                    IsActive = true,
                    PasswordHash = HashPassword(password),
                    CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)
                };

                users.Add(newUser);
                await SaveUsersAsync(app, users);
                return Results.Json(new { success = true, user = ToSafeDto(newUser) });
            }
            finally
            {
                UsersLock.Release();
            }
        });

        app.MapPut("/api/admin/users/{id}", async (string id, UpdateAdminUserRequest req) =>
        {
            await UsersLock.WaitAsync();
            try
            {
                var users = await LoadUsersAsync(app);
                var target = users.FirstOrDefault(u => string.Equals(u.Id, id, StringComparison.OrdinalIgnoreCase));
                if (target is null)
                    return Results.NotFound(new { error = "المستخدم غير موجود" });

                if (!string.IsNullOrWhiteSpace(req.Username))
                {
                    var newUsername = req.Username.Trim();
                    if (newUsername.Length < 2 || newUsername.Length > 60)
                        return Results.BadRequest(new { error = "اسم المستخدم يجب أن يكون بين حرفين و 60 حرفاً" });

                    if (users.Any(u => !string.Equals(u.Id, target.Id, StringComparison.OrdinalIgnoreCase) &&
                                       string.Equals(u.Username, newUsername, StringComparison.OrdinalIgnoreCase)))
                        return Results.BadRequest(new { error = "اسم المستخدم مستخدم بالفعل لحساب آخر" });

                    target.Username = newUsername;
                }

                if (!string.IsNullOrWhiteSpace(req.DisplayName))
                    target.DisplayName = req.DisplayName.Trim();

                var nextRole = req.Role is not null ? NormalizeRole(req.Role) : target.Role;
                var nextActive = req.IsActive ?? target.IsActive;

                // Ensure at least one active admin remains
                var otherActiveAdmins = users.Count(u =>
                    !string.Equals(u.Id, target.Id, StringComparison.OrdinalIgnoreCase) &&
                    u.IsActive &&
                    string.Equals(u.Role, "admin", StringComparison.OrdinalIgnoreCase));

                if (otherActiveAdmins == 0 && (!nextActive || !string.Equals(nextRole, "admin", StringComparison.OrdinalIgnoreCase)))
                    return Results.BadRequest(new { error = "لا يمكن إيقاف أو تخفيض صلاحية حساب مدير النظام الوحيد النشط" });

                target.Role = nextRole;
                target.IsActive = nextActive;

                if (!string.IsNullOrEmpty(req.Password))
                {
                    if (req.Password.Length < 4 || req.Password.Length > 256)
                        return Results.BadRequest(new { error = "كلمة المرور يجب أن تتكون من 4 خانات على الأقل" });
                    target.PasswordHash = HashPassword(req.Password);
                }

                await SaveUsersAsync(app, users);
                return Results.Json(new { success = true, user = ToSafeDto(target) });
            }
            finally
            {
                UsersLock.Release();
            }
        });

        app.MapPost("/api/admin/change-password", async (HttpContext context, ChangePasswordRequest req) =>
        {
            var newPass = req.NewPassword ?? "";
            if (newPass.Length < 4 || newPass.Length > 256)
                return Results.BadRequest(new { error = "كلمة المرور الجديدة يجب أن تتكون من 4 خانات على الأقل" });

            await UsersLock.WaitAsync();
            try
            {
                var users = await LoadUsersAsync(app);
                AdminUserRecord? target = null;

                if (!string.IsNullOrWhiteSpace(req.UserId))
                    target = users.FirstOrDefault(u => string.Equals(u.Id, req.UserId, StringComparison.OrdinalIgnoreCase));

                if (target is null && !string.IsNullOrWhiteSpace(req.Username))
                    target = users.FirstOrDefault(u => string.Equals(u.Username, req.Username.Trim(), StringComparison.OrdinalIgnoreCase));

                if (target is null && context.User.Identity?.Name is { Length: > 0 } loggedInName)
                    target = users.FirstOrDefault(u => string.Equals(u.Username, loggedInName, StringComparison.OrdinalIgnoreCase));

                target ??= users.FirstOrDefault();
                if (target is null)
                    return Results.NotFound(new { error = "لم يتم العثور على الحساب المطلوب" });

                target.PasswordHash = HashPassword(newPass);
                await SaveUsersAsync(app, users);

                return Results.Json(new
                {
                    success = true,
                    message = $"تم تغيير كلمة المرور لحساب ({target.DisplayName}) بنجاح",
                    user = ToSafeDto(target)
                });
            }
            finally
            {
                UsersLock.Release();
            }
        });

        app.MapDelete("/api/admin/users/{id}", async (string id) =>
        {
            await UsersLock.WaitAsync();
            try
            {
                var users = await LoadUsersAsync(app);
                var target = users.FirstOrDefault(u => string.Equals(u.Id, id, StringComparison.OrdinalIgnoreCase));
                if (target is null)
                    return Results.NotFound(new { error = "المستخدم غير موجود" });

                var remainingActiveAdmins = users.Count(u =>
                    !string.Equals(u.Id, target.Id, StringComparison.OrdinalIgnoreCase) &&
                    u.IsActive &&
                    string.Equals(u.Role, "admin", StringComparison.OrdinalIgnoreCase));

                if (remainingActiveAdmins == 0)
                    return Results.BadRequest(new { error = "لا يمكن حذف حساب مدير النظام الرئيسي الوحيد" });

                users.Remove(target);
                await SaveUsersAsync(app, users);
                return Results.Json(new { success = true });
            }
            finally
            {
                UsersLock.Release();
            }
        });
    }

    private static string NormalizeRole(string? role) =>
        (role ?? "").Trim().ToLowerInvariant() switch
        {
            "admin" => "admin",
            "sales" => "sales",
            "editor" => "editor",
            "viewer" => "viewer",
            _ => "sales"
        };

    private static string GetRoleLabel(string role) =>
        role switch
        {
            "admin" => "مدير النظام (صلاحيات كاملة)",
            "sales" => "موظف مبيعات وحجوزات",
            "editor" => "محرر محتوى ومشاريع",
            "viewer" => "مشرف متابعة واطلاع",
            _ => "موظف"
        };

    private static object ToSafeDto(AdminUserRecord u) => new
    {
        id = u.Id,
        username = u.Username,
        displayName = u.DisplayName,
        role = u.Role,
        roleLabel = GetRoleLabel(u.Role),
        isActive = u.IsActive,
        createdAt = u.CreatedAt
    };

    private static string GetUsersFilePath(WebApplication app) =>
        Path.Combine(app.Environment.ContentRootPath, "SeedData", "admin-users.json");

    private static List<AdminUserRecord> BuildDefaultUsers(WebApplication app)
    {
        var username = app.Configuration["Admin:Username"];
        if (string.IsNullOrWhiteSpace(username)) username = "admin";

        var hash = app.Configuration["Admin:PasswordHash"];
        if (string.IsNullOrWhiteSpace(hash)) hash = FallbackAdminHash;

        return
        [
            new AdminUserRecord
            {
                Id = "usr-admin",
                Username = username,
                DisplayName = "المدير العام (الإدارة)",
                Role = "admin",
                IsActive = true,
                PasswordHash = hash,
                CreatedAt = "2026-10-27T12:00:00Z"
            }
        ];
    }

    private static async Task<List<AdminUserRecord>> LoadUsersAsync(WebApplication app)
    {
        var filePath = GetUsersFilePath(app);
        List<AdminUserRecord>? fileUsers = null;
        DateTime fileUpdatedUtc = DateTime.MinValue;

        if (File.Exists(filePath))
        {
            try
            {
                fileUpdatedUtc = File.GetLastWriteTimeUtc(filePath);
                var json = await File.ReadAllTextAsync(filePath);
                fileUsers = JsonSerializer.Deserialize<List<AdminUserRecord>>(json, JsonOpts);
            }
            catch
            {
                // Ignore corrupted file and fall back
            }
        }

        List<AdminUserRecord>? dbUsers = null;
        DateTime dbUpdatedUtc = DateTime.MinValue;

        try
        {
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var conn = db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using (var ensureCmd = conn.CreateCommand())
            {
                ensureCmd.CommandText = """
                    IF OBJECT_ID(N'dbo.AdminUsersStore', N'U') IS NULL
                    CREATE TABLE dbo.AdminUsersStore (
                        Id INT NOT NULL PRIMARY KEY,
                        JsonData NVARCHAR(MAX) NOT NULL,
                        UpdatedAt DATETIME2 NOT NULL
                    );
                    """;
                await ensureCmd.ExecuteNonQueryAsync();
            }

            await using (var selectCmd = conn.CreateCommand())
            {
                selectCmd.CommandText = "SELECT JsonData, UpdatedAt FROM dbo.AdminUsersStore WHERE Id = 1;";
                await using var reader = await selectCmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    var rawJson = reader.GetString(0);
                    dbUpdatedUtc = DateTime.SpecifyKind(reader.GetDateTime(1), DateTimeKind.Utc);
                    dbUsers = JsonSerializer.Deserialize<List<AdminUserRecord>>(rawJson, JsonOpts);
                }
            }
        }
        catch
        {
            // SQL not reachable; use file fallback
        }

        if (dbUsers is { Count: > 0 } && fileUsers is { Count: > 0 })
        {
            return fileUpdatedUtc > dbUpdatedUtc.AddSeconds(2) ? fileUsers : dbUsers;
        }

        if (dbUsers is { Count: > 0 }) return dbUsers;
        if (fileUsers is { Count: > 0 }) return fileUsers;

        var defaults = BuildDefaultUsers(app);
        await SaveUsersAsync(app, defaults);
        return defaults;
    }

    private static async Task SaveUsersAsync(WebApplication app, List<AdminUserRecord> users)
    {
        var json = JsonSerializer.Serialize(users, JsonOpts);
        var nowUtc = DateTime.UtcNow;

        var filePath = GetUsersFilePath(app);
        try
        {
            var dir = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
            await File.WriteAllTextAsync(filePath, json);
        }
        catch
        {
            // Ignore file write errors if read-only filesystem
        }

        try
        {
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var conn = db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
                await conn.OpenAsync();

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                IF OBJECT_ID(N'dbo.AdminUsersStore', N'U') IS NULL
                CREATE TABLE dbo.AdminUsersStore (
                    Id INT NOT NULL PRIMARY KEY,
                    JsonData NVARCHAR(MAX) NOT NULL,
                    UpdatedAt DATETIME2 NOT NULL
                );
                IF EXISTS (SELECT 1 FROM dbo.AdminUsersStore WHERE Id = 1)
                    UPDATE dbo.AdminUsersStore SET JsonData = @json, UpdatedAt = @now WHERE Id = 1;
                ELSE
                    INSERT INTO dbo.AdminUsersStore (Id, JsonData, UpdatedAt) VALUES (1, @json, @now);
                """;
            var pJson = cmd.CreateParameter();
            pJson.ParameterName = "@json";
            pJson.Value = json;
            cmd.Parameters.Add(pJson);

            var pNow = cmd.CreateParameter();
            pNow.ParameterName = "@now";
            pNow.Value = nowUtc;
            cmd.Parameters.Add(pNow);

            await cmd.ExecuteNonQueryAsync();
        }
        catch
        {
            // Ignore SQL write errors if SQL is offline locally
        }
    }

    public static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, DefaultIterations, HashAlgorithmName.SHA256, 32);
        return $"{DefaultIterations.ToString(CultureInfo.InvariantCulture)}:{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
    }

    private static bool VerifyPassword(string password, string encoded)
    {
        try
        {
            var parts = encoded.Split(':');
            if (parts.Length != 3 || password.Length > 256) return false;
            var iterations = int.Parse(parts[0], CultureInfo.InvariantCulture);
            if (iterations < 100_000 || iterations > 1_000_000) return false;
            var salt = Convert.FromBase64String(parts[1]);
            var expected = Convert.FromBase64String(parts[2]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, 32);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (Exception ex) when (ex is FormatException or ArgumentException or OverflowException) { return false; }
    }
}
