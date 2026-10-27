using System.Text.Json;
using AlHawdAlHadi.Api.Data.Entities;
using AlHawdAlHadi.Api.Infrastructure;
using AlHawdAlHadi.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AlHawdAlHadi.Api.Data;

/// <summary>Applies pending EF Core migrations and seeds initial content on first run.</summary>
public static class DbInitializer
{
    private static readonly (int Number, string Title, string Category)[] Scenes =
    [
        (1, "مشهد 1: الشارع الرئيسي للمجمع السكني", "واجهات خارجية"),
        (2, "مشهد 2: الصالة الرئيسية البانورامية", "تصميم داخلي"),
        (3, "مشهد 3: المسبح والحدائق والمرافق", "أسلوب حياة"),
        (4, "مشهد 4: إطلالة جوية للمجمع السكني", "واجهات خارجية"),
        (5, "مشهد 5: الحمام الرئيسي الفاخر", "تصميم داخلي"),
        (6, "مشهد 6: غرفة النوم الماستر", "تصميم داخلي"),
        (7, "مشهد 7: المدخل المعماري واللوبي", "واجهات خارجية"),
        (8, "مشهد 8: التراس البانورامي الخارجي", "تراس وإطلالة"),
        (9, "مشهد 9: المطبخ العصري المفتوح", "تصميم داخلي"),
        (10, "مشهد 10: المبنى السكني الرئيسي (زاوية ثلاثية)", "واجهات خارجية")
    ];

    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<AppDbContext>();
        var env = sp.GetRequiredService<IWebHostEnvironment>();
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("DbInitializer");

        await db.Database.MigrateAsync(ct);

        if (!await db.SiteSettings.AnyAsync(ct))
        {
            logger.LogInformation("Seeding default CMS content...");
            var cms = sp.GetRequiredService<ICmsService>();
            await cms.SaveDocumentAsync(await CmsService.LoadDefaultDocumentAsync(env, ct), ct);
        }

        if (!await db.MediaScenes.AnyAsync(ct))
        {
            db.MediaScenes.AddRange(Scenes.Select(s => new MediaScene
            {
                Number = s.Number,
                Title = s.Title,
                Category = s.Category,
                LightUrl = $"/images/light/scene-{s.Number}.png",
                DarkUrl = $"/images/dark/scene-{s.Number}.png"
            }));
            await db.SaveChangesAsync(ct);
        }

        if (env.IsDevelopment() && !await db.Bookings.AnyAsync(ct))
        {
            var path = Path.Combine(env.ContentRootPath, "SeedData", "default-bookings.json");
            if (File.Exists(path))
            {
                await using var stream = File.OpenRead(path);
                var seed = await JsonSerializer.DeserializeAsync<List<SeedBooking>>(stream, JsonDefaults.Options, ct) ?? [];
                db.Bookings.AddRange(seed.Select(b => new Booking
                {
                    Name = b.Name, Phone = b.Phone, Email = b.Email, Project = b.Project, Unit = b.Unit,
                    PreferredDate = b.PreferredDate, PreferredTime = b.PreferredTime, Notes = b.Notes,
                    Status = b.Status, CreatedAt = b.CreatedAt == default ? DateTime.UtcNow : b.CreatedAt
                }));
                await db.SaveChangesAsync(ct);
            }
        }
    }

    /// <summary>Shape of SeedData/default-bookings.json (legacy string ids are ignored).</summary>
    private sealed class SeedBooking
    {
        public string Name { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Project { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public string PreferredDate { get; set; } = string.Empty;
        public string PreferredTime { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public string Status { get; set; } = BookingStatuses.New;
        public DateTime CreatedAt { get; set; }
    }
}
