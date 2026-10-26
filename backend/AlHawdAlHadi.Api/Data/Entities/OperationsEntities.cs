using System.ComponentModel.DataAnnotations;

namespace AlHawdAlHadi.Api.Data.Entities;

public static class BookingStatuses
{
    public const string New = "new";
    public const string Contacted = "contacted";
    public const string Confirmed = "confirmed";
    public const string Cancelled = "cancelled";

    public static readonly string[] All = [New, Contacted, Confirmed, Cancelled];
}

/// <summary>Viewing appointment request submitted from the website.</summary>
public class Booking
{
    public int Id { get; set; }

    [MaxLength(150)] public string Name { get; set; } = string.Empty;
    [MaxLength(50)] public string Phone { get; set; } = string.Empty;
    [MaxLength(200)] public string Email { get; set; } = string.Empty;
    [MaxLength(200)] public string Project { get; set; } = string.Empty;
    [MaxLength(200)] public string Unit { get; set; } = string.Empty;
    [MaxLength(30)] public string PreferredDate { get; set; } = string.Empty;
    [MaxLength(30)] public string PreferredTime { get; set; } = string.Empty;
    [MaxLength(2000)] public string Notes { get; set; } = string.Empty;
    [MaxLength(20)] public string Status { get; set; } = BookingStatuses.New;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>Built-in architectural scene available in both Light and Dark mode.</summary>
public class MediaScene
{
    public int Id { get; set; }
    public int Number { get; set; }
    [MaxLength(200)] public string Title { get; set; } = string.Empty;
    [MaxLength(100)] public string Category { get; set; } = string.Empty;
    [MaxLength(500)] public string LightUrl { get; set; } = string.Empty;
    [MaxLength(500)] public string DarkUrl { get; set; } = string.Empty;
}

/// <summary>Image uploaded from the CMS media library.</summary>
public class MediaAsset
{
    public int Id { get; set; }
    [MaxLength(260)] public string FileName { get; set; } = string.Empty;
    [MaxLength(260)] public string OriginalName { get; set; } = string.Empty;
    [MaxLength(500)] public string Url { get; set; } = string.Empty;
    [MaxLength(100)] public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
