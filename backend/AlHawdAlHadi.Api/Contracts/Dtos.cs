using System.ComponentModel.DataAnnotations;

namespace AlHawdAlHadi.Api.Contracts;

// ---------------------------------------------------------------------------
// CMS document contracts. Property names (camelCase) match the JSON consumed
// by the HTML/CSS/JS front-end (public site + admin dashboard).
// ---------------------------------------------------------------------------

public sealed class SectionVisibilityDto
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

public sealed class SettingsDto
{
    public string BrandNameAr { get; set; } = string.Empty;
    public string BrandNameEn { get; set; } = string.Empty;
    public string DefaultTheme { get; set; } = "light";
    public string AccentColorLight { get; set; } = "#E2C088";
    public string AccentColorDark { get; set; } = "#DCB685";
    public string Phone { get; set; } = string.Empty;
    public string Whatsapp { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string LocationAr { get; set; } = string.Empty;
    public string HeaderCtaText { get; set; } = string.Empty;
    public string LanguageLabel { get; set; } = "EN";
    public SectionVisibilityDto SectionVisibility { get; set; } = new();
}

public sealed class NavLinkDto
{
    public string? Id { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Href { get; set; } = string.Empty;
    public bool Active { get; set; }
}

public sealed class HeroSlideDto
{
    public string? Id { get; set; }
    public string Number { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ImageLight { get; set; } = string.Empty;
    public string ImageDark { get; set; } = string.Empty;
}

public sealed class ProjectDto
{
    public string? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string LocationLight { get; set; } = string.Empty;
    public string LocationDark { get; set; } = string.Empty;
    public string UnitsCount { get; set; } = string.Empty;
    public string FloorsCountLight { get; set; } = string.Empty;
    public string FloorsCountDark { get; set; } = string.Empty;
    public string StatusText { get; set; } = string.Empty;
    public string StatusType { get; set; } = "available";
    public string ImageLight { get; set; } = string.Empty;
    public string ImageDark { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public sealed class ApartmentFeatureDto
{
    public string? Id { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string LabelLight { get; set; } = string.Empty;
    public string LabelDark { get; set; } = string.Empty;
    public int GalleryIndex { get; set; }
}

public sealed class GalleryImageDto
{
    public string? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ImageLight { get; set; } = string.Empty;
    public string ImageDark { get; set; } = string.Empty;
}

public sealed class ApartmentDto
{
    public string? Id { get; set; }
    public string? BuildingId { get; set; } = "proj-1";
    public string? BuildingName { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Type { get; set; } = string.Empty;
    public string Status { get; set; } = "available";
    public string StatusText { get; set; } = string.Empty;
    public string Area { get; set; } = string.Empty;
    public string Floor { get; set; } = string.Empty;
    public string Bedrooms { get; set; } = string.Empty;
    public string? Bathrooms { get; set; } = string.Empty;
    public string Direction { get; set; } = string.Empty;
    public string Price { get; set; } = string.Empty;
    public string? PriceNote { get; set; } = string.Empty;
    public string? PlanImage { get; set; } = string.Empty;
    public string? MainImage { get; set; } = string.Empty;
    public string BookCtaText { get; set; } = string.Empty;
    public string DownloadPlanText { get; set; } = string.Empty;
    public List<ApartmentFeatureDto> Features { get; set; } = [];
    public List<GalleryImageDto> Gallery { get; set; } = [];
}

public sealed class AmenityDto
{
    public string? Id { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class StatDto
{
    public string? Id { get; set; }
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class ProximityDto
{
    public string? Id { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string PinId { get; set; } = string.Empty;
}

public sealed class MapPinDto
{
    public string? Id { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string LabelLight { get; set; } = string.Empty;
    public string LabelDark { get; set; } = string.Empty;
    public double X { get; set; }
    public double Y { get; set; }
}

public sealed class QuickContactDto
{
    public string? Id { get; set; }
    public string Icon { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
}

public sealed class LinkDto
{
    public string? Id { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Href { get; set; } = string.Empty;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

public sealed class BookingDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Project { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string PreferredDate { get; set; } = string.Empty;
    public string PreferredTime { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string Status { get; set; } = "new";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class CreateBookingRequest
{
    [Required(ErrorMessage = "الاسم ورقم الهاتف مطلوبان")]
    [MaxLength(150, ErrorMessage = "الاسم طويل جداً")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "الاسم ورقم الهاتف مطلوبان")]
    [MaxLength(50, ErrorMessage = "رقم الهاتف غير صالح")]
    [RegularExpression(@"^[0-9+()\-\s]{6,50}$", ErrorMessage = "رقم الهاتف غير صالح")]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(200)]
    [EmailAddress(ErrorMessage = "البريد الإلكتروني غير صالح")]
    public string? Email { get; set; }

    [MaxLength(200)] public string? Project { get; set; }
    [MaxLength(200)] public string? Unit { get; set; }
    [MaxLength(30)] public string? PreferredDate { get; set; }
    [MaxLength(30)] public string? PreferredTime { get; set; }
    [MaxLength(2000)] public string? Notes { get; set; }
}

public sealed class UpdateBookingRequest
{
    [MaxLength(20)] public string? Status { get; set; }
    [MaxLength(2000)] public string? Notes { get; set; }
    [MaxLength(30)] public string? PreferredDate { get; set; }
    [MaxLength(30)] public string? PreferredTime { get; set; }
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

public sealed record MediaPairDto(string Id, string Title, string Category, string LightUrl, string DarkUrl);

public sealed record MediaUploadDto(int Id, string Filename, string Url, long SizeBytes, DateTime UploadedAt);

public sealed record MediaCatalogDto(IReadOnlyList<MediaPairDto> Pairs, IReadOnlyList<MediaUploadDto> Uploads);

public sealed class DataUrlUploadRequest
{
    [MaxLength(260)] public string? Filename { get; set; }

    [Required(ErrorMessage = "يرجى إرسال ملف صورة صالح")]
    public string DataUrl { get; set; } = string.Empty;

    public long? OriginalSize { get; set; }
}
