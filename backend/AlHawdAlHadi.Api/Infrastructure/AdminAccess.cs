using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Encodings.Web;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.RateLimiting;

namespace AlHawdAlHadi.Api.Infrastructure;

public static class AdminAccess
{
    private const string Scheme = "AdminCookie";

    public static void AddAdminAccess(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment env)
    {
        services.AddAntiforgery();
        services.AddAuthentication(Scheme).AddCookie(Scheme, options =>
        {
            options.Cookie.Name = "AlHawd.Admin";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = env.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.ExpireTimeSpan = TimeSpan.FromHours(4);
            options.SlidingExpiration = false;
        });
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy("admin-login", context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
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
                    var expectedOrigin = $"{context.Request.Scheme}://{context.Request.Host}";
                    if (!string.Equals(origin, expectedOrigin, StringComparison.OrdinalIgnoreCase))
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        return;
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
            var error = context.Request.Query.ContainsKey("error") ? "اسم المستخدم أو كلمة المرور غير صحيحة" : "";
            var html = $$"""
                <!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                <title>تسجيل دخول الإدارة | الحوض الهادي</title>
                <style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101c20;color:#f3eee1;font:18px Tahoma,sans-serif}main{width:min(350px,80vw);padding:32px;background:#1b2a30;border-radius:16px}h1{font-size:25px}label{display:block;margin:20px 0 8px}input,button{box-sizing:border-box;width:100%;padding:13px;border:1px solid #62716e;border-radius:6px;font:inherit}button{margin-top:24px;background:#dbc598;color:#182529;cursor:pointer}.error{color:#ffb8b8}a{color:#dbc598}</style>
                <main><h1>إدارة الحوض الهادي</h1><p>سجّل الدخول لإدارة المحتوى وطلبات الحجز.</p><p class="error">{{error}}</p>
                <form method="post" action="/admin/login">
                <input type="hidden" name="{{HtmlEncoder.Default.Encode(tokens.FormFieldName)}}" value="{{HtmlEncoder.Default.Encode(tokens.RequestToken ?? "")}}">
                <label for="username">اسم المستخدم</label><input id="username" name="username" autocomplete="username" required maxlength="100">
                <label for="password">كلمة المرور</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256">
                <button>تسجيل الدخول</button></form><p><a href="/">العودة إلى الموقع</a></p></main></html>
                """;
            return Results.Content(html, "text/html; charset=utf-8");
        });

        app.MapPost("/admin/login", async (HttpContext context, IAntiforgery antiforgery) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            try { await antiforgery.ValidateRequestAsync(context); }
            catch (AntiforgeryValidationException) { return Results.BadRequest(); }
            var form = await context.Request.ReadFormAsync();
            var username = app.Configuration["Admin:Username"];
            var hash = app.Configuration["Admin:PasswordHash"];
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(hash) ||
                form["username"] != username || !VerifyPassword(form["password"].ToString(), hash))
                return Results.Redirect("/admin/login?error=1");
            var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, username)], Scheme));
            await context.SignInAsync(Scheme, principal);
            return Results.Redirect("/admin");
        }).RequireRateLimiting("admin-login");
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
