using System.ComponentModel.DataAnnotations;

namespace AlHawdAlHadi.Api.Data.Entities;

public static class ProjectStatusTypes
{
    public const string Available = "available";
    public const string Completed = "completed";
    public const string Construction = "construction";
}

public class Project : OrderedEntity
{
    [MaxLength(200)] public string Title { get; set; } = string.Empty;
    [MaxLength(200)] public string LocationLight { get; set; } = string.Empty;
    [MaxLength(200)] public string LocationDark { get; set; } = string.Empty;
    [MaxLength(50)] public string UnitsCount { get; set; } = string.Empty;
    [MaxLength(50)] public string FloorsCountLight { get; set; } = string.Empty;
    [MaxLength(50)] public string FloorsCountDark { get; set; } = string.Empty;
    [MaxLength(50)] public string StatusText { get; set; } = string.Empty;
    [MaxLength(20)] public string StatusType { get; set; } = ProjectStatusTypes.Available;
    [MaxLength(500)] public string ImageLight { get; set; } = string.Empty;
    [MaxLength(500)] public string ImageDark { get; set; } = string.Empty;
    [MaxLength(2000)] public string Description { get; set; } = string.Empty;
}

public static class ApartmentStatuses
{
    public const string Available = "available";
    public const string Reserved = "reserved";
    public const string Sold = "sold";
}

public class Apartment : OrderedEntity
{
    [MaxLength(10)] public string Code { get; set; } = string.Empty;
    [MaxLength(100)] public string Title { get; set; } = string.Empty;
    [MaxLength(20)] public string Status { get; set; } = ApartmentStatuses.Available;
    [MaxLength(50)] public string StatusText { get; set; } = string.Empty;
    [MaxLength(50)] public string Area { get; set; } = string.Empty;
    [MaxLength(20)] public string Floor { get; set; } = string.Empty;
    [MaxLength(20)] public string Bedrooms { get; set; } = string.Empty;
    [MaxLength(100)] public string Direction { get; set; } = string.Empty;
    [MaxLength(50)] public string Price { get; set; } = string.Empty;
    [MaxLength(100)] public string BookCtaText { get; set; } = string.Empty;
    [MaxLength(100)] public string DownloadPlanText { get; set; } = string.Empty;

    public List<ApartmentFeature> Features { get; set; } = [];
    public List<ApartmentGalleryImage> Gallery { get; set; } = [];
}

public class ApartmentFeature : OrderedEntity
{
    public int ApartmentId { get; set; }
    public Apartment? Apartment { get; set; }

    [MaxLength(50)] public string Icon { get; set; } = string.Empty;
    [MaxLength(150)] public string LabelLight { get; set; } = string.Empty;
    [MaxLength(150)] public string LabelDark { get; set; } = string.Empty;

    /// <summary>Index of the gallery image opened when the feature is clicked.</summary>
    public int GalleryIndex { get; set; }
}

public class ApartmentGalleryImage : OrderedEntity
{
    public int ApartmentId { get; set; }
    public Apartment? Apartment { get; set; }

    [MaxLength(200)] public string Title { get; set; } = string.Empty;
    [MaxLength(500)] public string ImageLight { get; set; } = string.Empty;
    [MaxLength(500)] public string ImageDark { get; set; } = string.Empty;
}
