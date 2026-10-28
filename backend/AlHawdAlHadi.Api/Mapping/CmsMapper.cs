using AlHawdAlHadi.Api.Contracts;
using AlHawdAlHadi.Api.Data.Entities;

namespace AlHawdAlHadi.Api.Mapping;

/// <summary>Explicit, allocation-light mapping between EF Core entities and API contracts.</summary>
public static class CmsMapper
{
    private static string Cid(string? id, string prefix) =>
        string.IsNullOrWhiteSpace(id) ? $"{prefix}-{Guid.NewGuid():N}"[..Math.Min(prefix.Length + 13, 64)] : id.Trim();

    // ----- Settings -----
    public static SettingsDto ToDto(this SiteSettings s) => new()
    {
        BrandNameAr = s.BrandNameAr,
        BrandNameEn = s.BrandNameEn,
        DefaultTheme = s.DefaultTheme,
        AccentColorLight = s.AccentColorLight,
        AccentColorDark = s.AccentColorDark,
        Phone = s.Phone,
        Whatsapp = s.Whatsapp,
        Email = s.Email,
        LocationAr = s.LocationAr,
        HeaderCtaText = s.HeaderCtaText,
        LanguageLabel = s.LanguageLabel,
        SectionVisibility = new SectionVisibilityDto
        {
            Hero = s.SectionVisibility.Hero,
            Projects = s.SectionVisibility.Projects,
            Explorer = s.SectionVisibility.Explorer,
            UnitDetails = s.SectionVisibility.UnitDetails,
            Lifestyle = s.SectionVisibility.Lifestyle,
            About = s.SectionVisibility.About,
            Location = s.SectionVisibility.Location,
            CtaBanner = s.SectionVisibility.CtaBanner,
            Footer = s.SectionVisibility.Footer
        }
    };

    public static void Apply(this SiteSettings s, SettingsDto d)
    {
        s.BrandNameAr = d.BrandNameAr;
        s.BrandNameEn = d.BrandNameEn;
        s.DefaultTheme = d.DefaultTheme == "dark" ? "dark" : "light";
        s.AccentColorLight = d.AccentColorLight;
        s.AccentColorDark = d.AccentColorDark;
        s.Phone = d.Phone;
        s.Whatsapp = d.Whatsapp;
        s.Email = d.Email;
        s.LocationAr = d.LocationAr;
        s.HeaderCtaText = d.HeaderCtaText;
        s.LanguageLabel = d.LanguageLabel;
        var v = d.SectionVisibility ?? new SectionVisibilityDto();
        s.SectionVisibility ??= new SectionVisibility();
        s.SectionVisibility.Hero = v.Hero;
        s.SectionVisibility.Projects = v.Projects;
        s.SectionVisibility.Explorer = v.Explorer;
        s.SectionVisibility.UnitDetails = v.UnitDetails;
        s.SectionVisibility.Lifestyle = v.Lifestyle;
        s.SectionVisibility.About = v.About;
        s.SectionVisibility.Location = v.Location;
        s.SectionVisibility.CtaBanner = v.CtaBanner;
        s.SectionVisibility.Footer = v.Footer;
        s.UpdatedAt = DateTime.UtcNow;
    }

    // ----- Navigation & simple lists -----
    public static NavLinkDto ToDto(this NavLink e) => new() { Id = e.ClientId, Label = e.Label, Href = e.Href, Active = e.IsActive };
    public static NavLink ToEntity(this NavLinkDto d, int order) => new() { ClientId = Cid(d.Id, "nav"), SortOrder = order, Label = d.Label, Href = d.Href, IsActive = d.Active };

    public static HeroSlideDto ToDto(this HeroSlide e) => new() { Id = e.ClientId, Number = e.Number, Title = e.Title, ImageLight = e.ImageLight, ImageDark = e.ImageDark };
    public static HeroSlide ToEntity(this HeroSlideDto d, int order) => new() { ClientId = Cid(d.Id, "slide"), SortOrder = order, Number = d.Number, Title = d.Title, ImageLight = d.ImageLight, ImageDark = d.ImageDark };

    public static AmenityDto ToDto(this Amenity e) => new() { Id = e.ClientId, Icon = e.Icon, Label = e.Label };
    public static Amenity ToEntity(this AmenityDto d, int order) => new() { ClientId = Cid(d.Id, "am"), SortOrder = order, Icon = d.Icon, Label = d.Label };

    public static StatDto ToDto(this CompanyStat e) => new() { Id = e.ClientId, Value = e.Value, Label = e.Label };
    public static CompanyStat ToEntity(this StatDto d, int order) => new() { ClientId = Cid(d.Id, "stat"), SortOrder = order, Value = d.Value, Label = d.Label };

    public static ProximityDto ToDto(this Proximity e) => new() { Id = e.ClientId, Icon = e.Icon, Label = e.Label, Time = e.Time, PinId = e.PinId };
    public static Proximity ToEntity(this ProximityDto d, int order) => new() { ClientId = Cid(d.Id, "prox"), SortOrder = order, Icon = d.Icon, Label = d.Label, Time = d.Time, PinId = d.PinId };

    public static MapPinDto ToDto(this MapPin e) => new() { Id = e.ClientId, Icon = e.Icon, LabelLight = e.LabelLight, LabelDark = e.LabelDark, X = e.X, Y = e.Y };
    public static MapPin ToEntity(this MapPinDto d, int order) => new()
    {
        ClientId = Cid(d.Id, "pin"), SortOrder = order, Icon = d.Icon, LabelLight = d.LabelLight, LabelDark = d.LabelDark,
        X = Math.Clamp(d.X, 0, 100), Y = Math.Clamp(d.Y, 0, 100)
    };

    public static QuickContactDto ToDto(this QuickContact e) => new() { Id = e.ClientId, Icon = e.Icon, Label = e.Label, Action = e.Action };
    public static QuickContact ToEntity(this QuickContactDto d, int order) => new() { ClientId = Cid(d.Id, "qc"), SortOrder = order, Icon = d.Icon, Label = d.Label, Action = d.Action };

    public static LinkDto ToDto(this FooterLink e) => new() { Id = e.ClientId, Label = e.Label, Href = e.Href };
    public static FooterLink ToEntity(this LinkDto d, string group, int order) => new() { ClientId = Cid(d.Id, group == FooterLinkGroups.Services ? "srv" : "ql"), Group = group, SortOrder = order, Label = d.Label, Href = d.Href };

    // ----- Projects -----
    public static ProjectDto ToDto(this Project e) => new()
    {
        Id = e.ClientId, Title = e.Title, LocationLight = e.LocationLight, LocationDark = e.LocationDark,
        UnitsCount = e.UnitsCount, FloorsCountLight = e.FloorsCountLight, FloorsCountDark = e.FloorsCountDark,
        StatusText = e.StatusText, StatusType = e.StatusType, ImageLight = e.ImageLight, ImageDark = e.ImageDark,
        Description = e.Description
    };

    public static Project ToEntity(this ProjectDto d, int order) => new()
    {
        ClientId = Cid(d.Id, "proj"), SortOrder = order, Title = d.Title, LocationLight = d.LocationLight,
        LocationDark = d.LocationDark, UnitsCount = d.UnitsCount, FloorsCountLight = d.FloorsCountLight,
        FloorsCountDark = d.FloorsCountDark, StatusText = d.StatusText,
        StatusType = d.StatusType is ProjectStatusTypes.Completed or ProjectStatusTypes.Construction ? d.StatusType : ProjectStatusTypes.Available,
        ImageLight = d.ImageLight, ImageDark = d.ImageDark, Description = d.Description
    };

    // ----- Apartments -----
    public static ApartmentDto ToDto(this Apartment e) => new()
    {
        Id = e.ClientId, BuildingId = string.IsNullOrEmpty(e.BuildingId) ? "proj-1" : e.BuildingId,
        BuildingName = e.BuildingName, Code = e.Code, Title = e.Title, Type = e.Type,
        Status = e.Status, StatusText = e.StatusText, Area = e.Area,
        Floor = e.Floor, Bedrooms = e.Bedrooms, Bathrooms = e.Bathrooms, Direction = e.Direction,
        Price = e.Price, PriceNote = e.PriceNote, PlanImage = e.PlanImage, MainImage = e.MainImage,
        BookCtaText = e.BookCtaText, DownloadPlanText = e.DownloadPlanText,
        Features = e.Features.OrderBy(f => f.SortOrder).Select(f => new ApartmentFeatureDto
        {
            Id = f.ClientId, Icon = f.Icon, LabelLight = f.LabelLight, LabelDark = f.LabelDark, GalleryIndex = f.GalleryIndex
        }).ToList(),
        Gallery = e.Gallery.OrderBy(g => g.SortOrder).Select(g => new GalleryImageDto
        {
            Id = g.ClientId, Title = g.Title, ImageLight = g.ImageLight, ImageDark = g.ImageDark
        }).ToList()
    };

    public static Apartment ToEntity(this ApartmentDto d, int order) => new()
    {
        ClientId = Cid(d.Id, "unit"), SortOrder = order, BuildingId = d.BuildingId ?? "proj-1",
        BuildingName = d.BuildingName ?? string.Empty, Code = d.Code, Title = d.Title, Type = d.Type ?? string.Empty,
        Status = d.Status is ApartmentStatuses.Reserved or ApartmentStatuses.Sold ? d.Status : ApartmentStatuses.Available,
        StatusText = d.StatusText, Area = d.Area, Floor = d.Floor, Bedrooms = d.Bedrooms,
        Bathrooms = d.Bathrooms ?? string.Empty, Direction = d.Direction,
        Price = d.Price, PriceNote = d.PriceNote ?? string.Empty, PlanImage = d.PlanImage ?? string.Empty,
        MainImage = d.MainImage ?? string.Empty, BookCtaText = d.BookCtaText, DownloadPlanText = d.DownloadPlanText,
        Features = (d.Features ?? []).Select((f, i) => new ApartmentFeature
        {
            ClientId = Cid(f.Id, "feat"), SortOrder = i, Icon = f.Icon, LabelLight = f.LabelLight,
            LabelDark = f.LabelDark, GalleryIndex = Math.Max(0, f.GalleryIndex)
        }).ToList(),
        Gallery = (d.Gallery ?? []).Select((g, i) => new ApartmentGalleryImage
        {
            ClientId = Cid(g.Id, "gal"), SortOrder = i, Title = g.Title, ImageLight = g.ImageLight, ImageDark = g.ImageDark
        }).ToList()
    };

    // ----- Bookings -----
    public static BookingDto ToDto(this Booking b) => new()
    {
        Id = b.Id, Name = b.Name, Phone = b.Phone, Email = b.Email, Project = b.Project, Unit = b.Unit,
        PreferredDate = b.PreferredDate, PreferredTime = b.PreferredTime, Notes = b.Notes, Status = b.Status,
        CreatedAt = b.CreatedAt, UpdatedAt = b.UpdatedAt
    };
}
