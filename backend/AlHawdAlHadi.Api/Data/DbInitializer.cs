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
        await EnsureSchemaUpgradedAsync(db, ct);

        if (!await db.SiteSettings.AnyAsync(ct) || !await db.Apartments.AnyAsync(a => a.ClientId == "apt-101", ct))
        {
            logger.LogInformation("Seeding / upgrading default multi-building CMS content...");
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
                LightUrl = $"/images/light/scene-{s.Number}.webp",
                DarkUrl = $"/images/dark/scene-{s.Number}.webp"
            }));
            await db.SaveChangesAsync(ct);
        }
        else
        {
            var pngScenes = await db.MediaScenes
                .Where(s => s.LightUrl.EndsWith(".png") || s.DarkUrl.EndsWith(".png"))
                .ToListAsync(ct);
            if (pngScenes.Count > 0)
            {
                foreach (var s in pngScenes)
                {
                    if (s.LightUrl.StartsWith("/images/light/scene-") && s.LightUrl.EndsWith(".png"))
                        s.LightUrl = s.LightUrl[..^4] + ".webp";
                    if (s.DarkUrl.StartsWith("/images/dark/scene-") && s.DarkUrl.EndsWith(".png"))
                        s.DarkUrl = s.DarkUrl[..^4] + ".webp";
                }
                await db.SaveChangesAsync(ct);
            }
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

    private static async Task EnsureSchemaUpgradedAsync(AppDbContext db, CancellationToken ct)
    {
        const string upgradeSql = """
            IF COL_LENGTH('dbo.Apartments', 'BuildingId') IS NULL
                ALTER TABLE [dbo].[Apartments] ADD [BuildingId] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Apartments_BuildingId] DEFAULT N'proj-1';
            IF COL_LENGTH('dbo.Apartments', 'BuildingName') IS NULL
                ALTER TABLE [dbo].[Apartments] ADD [BuildingName] NVARCHAR(200) NOT NULL CONSTRAINT [DF_Apartments_BuildingName] DEFAULT N'';
            IF COL_LENGTH('dbo.Apartments', 'Type') IS NULL
                ALTER TABLE [dbo].[Apartments] ADD [Type] NVARCHAR(200) NOT NULL CONSTRAINT [DF_Apartments_Type] DEFAULT N'';
            IF COL_LENGTH('dbo.Apartments', 'Bathrooms') IS NULL
                ALTER TABLE [dbo].[Apartments] ADD [Bathrooms] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Apartments_Bathrooms] DEFAULT N'';
            IF COL_LENGTH('dbo.Apartments', 'PriceNote') IS NULL
                ALTER TABLE [dbo].[Apartments] ADD [PriceNote] NVARCHAR(200) NOT NULL CONSTRAINT [DF_Apartments_PriceNote] DEFAULT N'';
            IF COL_LENGTH('dbo.Apartments', 'PlanImage') IS NULL
                ALTER TABLE [dbo].[Apartments] ADD [PlanImage] NVARCHAR(500) NOT NULL CONSTRAINT [DF_Apartments_PlanImage] DEFAULT N'';
            IF COL_LENGTH('dbo.Apartments', 'MainImage') IS NULL
                ALTER TABLE [dbo].[Apartments] ADD [MainImage] NVARCHAR(500) NOT NULL CONSTRAINT [DF_Apartments_MainImage] DEFAULT N'';

            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [Code] NVARCHAR(50) NOT NULL;
            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [Title] NVARCHAR(200) NOT NULL;
            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [Status] NVARCHAR(50) NOT NULL;
            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [StatusText] NVARCHAR(100) NOT NULL;
            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [Area] NVARCHAR(100) NOT NULL;
            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [Floor] NVARCHAR(100) NOT NULL;
            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [Bedrooms] NVARCHAR(100) NOT NULL;
            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [Direction] NVARCHAR(200) NOT NULL;
            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [Price] NVARCHAR(100) NOT NULL;
            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [BookCtaText] NVARCHAR(200) NOT NULL;
            ALTER TABLE [dbo].[Apartments] ALTER COLUMN [DownloadPlanText] NVARCHAR(200) NOT NULL;
            """;

        await db.Database.ExecuteSqlRawAsync(upgradeSql, ct);
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
