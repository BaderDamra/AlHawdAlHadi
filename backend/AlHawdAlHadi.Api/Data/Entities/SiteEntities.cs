using System.ComponentModel.DataAnnotations;

namespace AlHawdAlHadi.Api.Data.Entities;

/// <summary>
/// Base type for every list item managed from the CMS.
/// <para><see cref="Id"/> is the database identity, while <see cref="ClientId"/> is the stable
/// identifier used by the front-end (e.g. "proj-1", "slide-3").</para>
/// </summary>
public abstract class OrderedEntity
{
    public int Id { get; set; }

    [MaxLength(64)]
    public string ClientId { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}

/// <summary>Global website settings (single row).</summary>
public class SiteSettings
{
    public int Id { get; set; }

    [MaxLength(200)] public string BrandNameAr { get; set; } = string.Empty;
    [MaxLength(200)] public string BrandNameEn { get; set; } = string.Empty;
    [MaxLength(10)] public string DefaultTheme { get; set; } = "light";
    [MaxLength(20)] public string AccentColorLight { get; set; } = "#E2C088";
    [MaxLength(20)] public string AccentColorDark { get; set; } = "#DCB685";
    [MaxLength(50)] public string Phone { get; set; } = string.Empty;
    [MaxLength(50)] public string Whatsapp { get; set; } = string.Empty;
    [MaxLength(200)] public string Email { get; set; } = string.Empty;
    [MaxLength(200)] public string LocationAr { get; set; } = string.Empty;
    [MaxLength(100)] public string HeaderCtaText { get; set; } = string.Empty;
    [MaxLength(20)] public string LanguageLabel { get; set; } = "EN";

    public SectionVisibility SectionVisibility { get; set; } = new();

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Show / hide toggles for each home page section (owned type, stored as columns).</summary>
public class SectionVisibility
{
    public bool Hero { get; set; } = true;
    public bool Projects { get; set; } = true;
    public bool Explorer { get; set; } = true;
    public bool UnitDetails { get; set; } = true;
    public bool Lifestyle { get; set; } = true;
    public bool About { get; set; } = true;
    public bool Location { get; set; } = true;
    public bool CtaBanner { get; set; } = true;
    public bool Footer { get; set; } = true;
}

/// <summary>
/// Scalar content of a page section (titles, subtitles, CTA texts, images...) stored as JSON.
/// Repeating items of each section live in their own relational tables.
/// </summary>
public class PageSection
{
    [Key, MaxLength(64)]
    public string Key { get; set; } = string.Empty;

    public string ContentJson { get; set; } = "{}";

    public int SortOrder { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class NavLink : OrderedEntity
{
    [MaxLength(100)] public string Label { get; set; } = string.Empty;
    [MaxLength(300)] public string Href { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class HeroSlide : OrderedEntity
{
    [MaxLength(10)] public string Number { get; set; } = string.Empty;
    [MaxLength(300)] public string Title { get; set; } = string.Empty;
    [MaxLength(500)] public string ImageLight { get; set; } = string.Empty;
    [MaxLength(500)] public string ImageDark { get; set; } = string.Empty;
}

public class Amenity : OrderedEntity
{
    [MaxLength(50)] public string Icon { get; set; } = string.Empty;
    [MaxLength(150)] public string Label { get; set; } = string.Empty;
}

public class CompanyStat : OrderedEntity
{
    [MaxLength(50)] public string Value { get; set; } = string.Empty;
    [MaxLength(150)] public string Label { get; set; } = string.Empty;
}

public class Proximity : OrderedEntity
{
    [MaxLength(50)] public string Icon { get; set; } = string.Empty;
    [MaxLength(150)] public string Label { get; set; } = string.Empty;
    [MaxLength(50)] public string Time { get; set; } = string.Empty;
    [MaxLength(64)] public string PinId { get; set; } = string.Empty;
}

public class MapPin : OrderedEntity
{
    [MaxLength(50)] public string Icon { get; set; } = string.Empty;
    [MaxLength(150)] public string LabelLight { get; set; } = string.Empty;
    [MaxLength(150)] public string LabelDark { get; set; } = string.Empty;
    public double X { get; set; }
    public double Y { get; set; }
}

public class QuickContact : OrderedEntity
{
    [MaxLength(50)] public string Icon { get; set; } = string.Empty;
    [MaxLength(150)] public string Label { get; set; } = string.Empty;
    [MaxLength(500)] public string Action { get; set; } = string.Empty;
}

public static class FooterLinkGroups
{
    public const string Services = "services";
    public const string QuickLinks = "quickLinks";
}

public class FooterLink : OrderedEntity
{
    /// <summary>One of <see cref="FooterLinkGroups"/>.</summary>
    [MaxLength(30)] public string Group { get; set; } = FooterLinkGroups.QuickLinks;
    [MaxLength(150)] public string Label { get; set; } = string.Empty;
    [MaxLength(300)] public string Href { get; set; } = string.Empty;
}
