using System.Text.Json;
using System.Text.Json.Nodes;
using AlHawdAlHadi.Api.Contracts;
using AlHawdAlHadi.Api.Data;
using AlHawdAlHadi.Api.Data.Entities;
using AlHawdAlHadi.Api.Infrastructure;
using AlHawdAlHadi.Api.Mapping;
using Microsoft.EntityFrameworkCore;

namespace AlHawdAlHadi.Api.Services;

public interface ICmsService
{
    /// <summary>Builds the full CMS document consumed by the website and the dashboard.</summary>
    Task<JsonObject> GetDocumentAsync(CancellationToken ct = default);

    /// <summary>Persists a full CMS document (atomic, single transaction).</summary>
    Task SaveDocumentAsync(JsonObject document, CancellationToken ct = default);

    /// <summary>Replaces a single top-level section of the document.</summary>
    Task<JsonNode?> SaveSectionAsync(string sectionKey, JsonNode? content, CancellationToken ct = default);

    /// <summary>Restores the factory default content shipped in SeedData/default-cms.json.</summary>
    Task<JsonObject> ResetToDefaultsAsync(CancellationToken ct = default);
}

/// <summary>
/// Maps the hierarchical CMS JSON document to a relational SQL Server schema:
/// <list type="bullet">
/// <item>Global settings → <c>SiteSettings</c> (typed columns).</item>
/// <item>Repeating items (slides, projects, apartments, amenities, ...) → dedicated tables.</item>
/// <item>Remaining scalar section texts → <c>PageSections.ContentJson</c>.</item>
/// </list>
/// </summary>
public sealed class CmsService(AppDbContext db, IWebHostEnvironment env, ILogger<CmsService> logger) : ICmsService
{
    private const string SettingsKey = "settings";
    private const string NavigationKey = "navigation";

    private static JsonSerializerOptions Json => JsonDefaults.Options;

    public async Task<JsonObject> GetDocumentAsync(CancellationToken ct = default)
    {
        var settings = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(ct) ?? new SiteSettings();
        var sections = await db.PageSections.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(ct);

        var nav = await db.NavLinks.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct);
        var slides = await db.HeroSlides.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct);
        var projects = await db.Projects.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct);
        var apartments = await db.Apartments.AsNoTracking()
            .Include(a => a.Features).Include(a => a.Gallery)
            .AsSplitQuery()
            .OrderBy(x => x.SortOrder).ToListAsync(ct);
        var amenities = await db.Amenities.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct);
        var stats = await db.CompanyStats.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct);
        var proximities = await db.Proximities.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct);
        var pins = await db.MapPins.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct);
        var contacts = await db.QuickContacts.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct);
        var footerLinks = await db.FooterLinks.AsNoTracking().OrderBy(x => x.SortOrder).ToListAsync(ct);

        var doc = new JsonObject
        {
            [SettingsKey] = Node(settings.ToDto()),
            [NavigationKey] = Node(nav.Select(n => n.ToDto()))
        };

        foreach (var section in sections)
        {
            JsonNode? content;
            try { content = JsonNode.Parse(section.ContentJson); }
            catch (JsonException ex)
            {
                logger.LogWarning(ex, "Invalid JSON stored for section {Section}", section.Key);
                content = new JsonObject();
            }

            if (content is JsonObject obj)
            {
                switch (section.Key)
                {
                    case "hero":
                        obj["slides"] = Node(slides.Select(x => x.ToDto())); break;
                    case "projectsSection":
                        obj["projects"] = Node(projects.Select(x => x.ToDto())); break;
                    case "explorerSection":
                        obj["apartments"] = Node(apartments.Select(x => x.ToDto())); break;
                    case "lifestyleSection":
                        obj["amenities"] = Node(amenities.Select(x => x.ToDto())); break;
                    case "aboutSection":
                        obj["stats"] = Node(stats.Select(x => x.ToDto())); break;
                    case "locationSection":
                        obj["proximities"] = Node(proximities.Select(x => x.ToDto()));
                        obj["mapPins"] = Node(pins.Select(x => x.ToDto()));
                        break;
                    case "ctaBanner":
                        obj["quickContacts"] = Node(contacts.Select(x => x.ToDto())); break;
                    case "footer":
                        obj["services"] = Node(footerLinks.Where(l => l.Group == FooterLinkGroups.Services).Select(x => x.ToDto()));
                        obj["quickLinks"] = Node(footerLinks.Where(l => l.Group == FooterLinkGroups.QuickLinks).Select(x => x.ToDto()));
                        break;
                }
            }

            doc[section.Key] = content;
        }

        return doc;
    }

    public async Task SaveDocumentAsync(JsonObject document, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(document);

        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            db.ChangeTracker.Clear();

            // 1) Settings
            if (document[SettingsKey] is JsonObject settingsNode)
            {
                var dto = settingsNode.Deserialize<SettingsDto>(Json) ?? new SettingsDto();
                var entity = await db.SiteSettings.FirstOrDefaultAsync(ct);
                if (entity is null)
                {
                    entity = new SiteSettings();
                    db.SiteSettings.Add(entity);
                }
                entity.Apply(dto);
            }

            // 2) Navigation
            if (document[NavigationKey] is JsonArray navNode)
            {
                await db.NavLinks.ExecuteDeleteAsync(ct);
                db.NavLinks.AddRange(Items<NavLinkDto>(navNode).Select((d, i) => d.ToEntity(i)));
            }

            // 3) Sections (scalar content as JSON + collections as relational rows)
            var existingSections = await db.PageSections.ToDictionaryAsync(s => s.Key, ct);
            var order = 0;
            foreach (var (key, value) in document)
            {
                if (key is SettingsKey or NavigationKey) continue;
                order++;

                var content = value?.DeepClone();
                if (content is JsonObject obj)
                {
                    await ExtractCollectionsAsync(key, obj, ct);
                }

                if (!existingSections.TryGetValue(key, out var section))
                {
                    section = new PageSection { Key = key };
                    db.PageSections.Add(section);
                }
                section.ContentJson = content?.ToJsonString(Json) ?? "null";
                section.SortOrder = order;
                section.UpdatedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });
    }

    public async Task<JsonNode?> SaveSectionAsync(string sectionKey, JsonNode? content, CancellationToken ct = default)
    {
        var doc = await GetDocumentAsync(ct);
        doc[sectionKey] = content?.DeepClone();
        await SaveDocumentAsync(doc, ct);
        return doc[sectionKey];
    }

    public async Task<JsonObject> ResetToDefaultsAsync(CancellationToken ct = default)
    {
        var defaults = await LoadDefaultDocumentAsync(env, ct);
        await SaveDocumentAsync(defaults, ct);
        return await GetDocumentAsync(ct);
    }

    public static async Task<JsonObject> LoadDefaultDocumentAsync(IWebHostEnvironment env, CancellationToken ct = default)
    {
        var path = Path.Combine(env.ContentRootPath, "SeedData", "default-cms.json");
        await using var stream = File.OpenRead(path);
        return (await JsonNode.ParseAsync(stream, cancellationToken: ct)) as JsonObject
               ?? throw new InvalidOperationException("default-cms.json must contain a JSON object.");
    }

    /// <summary>Removes collection arrays from a section and persists them to their relational tables.</summary>
    private async Task ExtractCollectionsAsync(string sectionKey, JsonObject section, CancellationToken ct)
    {
        switch (sectionKey)
        {
            case "hero":
                if (Take(section, "slides") is { } slides)
                {
                    await db.HeroSlides.ExecuteDeleteAsync(ct);
                    db.HeroSlides.AddRange(Items<HeroSlideDto>(slides).Select((d, i) => d.ToEntity(i)));
                }
                break;

            case "projectsSection":
                if (Take(section, "projects") is { } projects)
                {
                    await db.Projects.ExecuteDeleteAsync(ct);
                    db.Projects.AddRange(Items<ProjectDto>(projects).Select((d, i) => d.ToEntity(i)));
                }
                break;

            case "explorerSection":
                if (Take(section, "apartments") is { } apartments)
                {
                    // Features & gallery rows are removed by ON DELETE CASCADE.
                    await db.Apartments.ExecuteDeleteAsync(ct);
                    db.Apartments.AddRange(Items<ApartmentDto>(apartments).Select((d, i) => d.ToEntity(i)));
                }
                break;

            case "lifestyleSection":
                if (Take(section, "amenities") is { } amenities)
                {
                    await db.Amenities.ExecuteDeleteAsync(ct);
                    db.Amenities.AddRange(Items<AmenityDto>(amenities).Select((d, i) => d.ToEntity(i)));
                }
                break;

            case "aboutSection":
                if (Take(section, "stats") is { } stats)
                {
                    await db.CompanyStats.ExecuteDeleteAsync(ct);
                    db.CompanyStats.AddRange(Items<StatDto>(stats).Select((d, i) => d.ToEntity(i)));
                }
                break;

            case "locationSection":
                if (Take(section, "proximities") is { } prox)
                {
                    await db.Proximities.ExecuteDeleteAsync(ct);
                    db.Proximities.AddRange(Items<ProximityDto>(prox).Select((d, i) => d.ToEntity(i)));
                }
                if (Take(section, "mapPins") is { } pins)
                {
                    await db.MapPins.ExecuteDeleteAsync(ct);
                    db.MapPins.AddRange(Items<MapPinDto>(pins).Select((d, i) => d.ToEntity(i)));
                }
                break;

            case "ctaBanner":
                if (Take(section, "quickContacts") is { } contacts)
                {
                    await db.QuickContacts.ExecuteDeleteAsync(ct);
                    db.QuickContacts.AddRange(Items<QuickContactDto>(contacts).Select((d, i) => d.ToEntity(i)));
                }
                break;

            case "footer":
                var services = Take(section, "services");
                var quickLinks = Take(section, "quickLinks");
                if (services is not null)
                {
                    await db.FooterLinks.Where(l => l.Group == FooterLinkGroups.Services).ExecuteDeleteAsync(ct);
                    db.FooterLinks.AddRange(Items<LinkDto>(services).Select((d, i) => d.ToEntity(FooterLinkGroups.Services, i)));
                }
                if (quickLinks is not null)
                {
                    await db.FooterLinks.Where(l => l.Group == FooterLinkGroups.QuickLinks).ExecuteDeleteAsync(ct);
                    db.FooterLinks.AddRange(Items<LinkDto>(quickLinks).Select((d, i) => d.ToEntity(FooterLinkGroups.QuickLinks, i)));
                }
                break;
        }
    }

    private static JsonArray? Take(JsonObject obj, string property)
    {
        if (!obj.TryGetPropertyValue(property, out var node)) return null;
        obj.Remove(property);
        return node as JsonArray ?? [];
    }

    private static IEnumerable<T> Items<T>(JsonArray array) where T : class =>
        array.Where(n => n is JsonObject).Select(n => n!.Deserialize<T>(Json)!).Where(x => x is not null);

    private static JsonNode? Node<T>(T value) => JsonSerializer.SerializeToNode(value, Json);
}
