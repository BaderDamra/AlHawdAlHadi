using AlHawdAlHadi.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlHawdAlHadi.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // Site & content
    public DbSet<SiteSettings> SiteSettings => Set<SiteSettings>();
    public DbSet<PageSection> PageSections => Set<PageSection>();
    public DbSet<NavLink> NavLinks => Set<NavLink>();
    public DbSet<HeroSlide> HeroSlides => Set<HeroSlide>();
    public DbSet<Amenity> Amenities => Set<Amenity>();
    public DbSet<CompanyStat> CompanyStats => Set<CompanyStat>();
    public DbSet<Proximity> Proximities => Set<Proximity>();
    public DbSet<MapPin> MapPins => Set<MapPin>();
    public DbSet<QuickContact> QuickContacts => Set<QuickContact>();
    public DbSet<FooterLink> FooterLinks => Set<FooterLink>();

    // Real estate
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Apartment> Apartments => Set<Apartment>();
    public DbSet<ApartmentFeature> ApartmentFeatures => Set<ApartmentFeature>();
    public DbSet<ApartmentGalleryImage> ApartmentGalleryImages => Set<ApartmentGalleryImage>();

    // Operations
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<MediaScene> MediaScenes => Set<MediaScene>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SiteSettings>(e =>
        {
            e.ToTable("SiteSettings");
            e.OwnsOne(s => s.SectionVisibility, v =>
            {
                v.Property(p => p.Hero).HasColumnName("ShowHero");
                v.Property(p => p.Projects).HasColumnName("ShowProjects");
                v.Property(p => p.Explorer).HasColumnName("ShowExplorer");
                v.Property(p => p.UnitDetails).HasColumnName("ShowUnitDetails");
                v.Property(p => p.Lifestyle).HasColumnName("ShowLifestyle");
                v.Property(p => p.About).HasColumnName("ShowAbout");
                v.Property(p => p.Location).HasColumnName("ShowLocation");
                v.Property(p => p.CtaBanner).HasColumnName("ShowCtaBanner");
                v.Property(p => p.Footer).HasColumnName("ShowFooter");
            });
        });

        modelBuilder.Entity<PageSection>().Property(p => p.ContentJson).HasColumnType("nvarchar(max)");

        modelBuilder.Entity<Apartment>(e =>
        {
            e.HasMany(a => a.Features).WithOne(f => f.Apartment!)
                .HasForeignKey(f => f.ApartmentId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(a => a.Gallery).WithOne(g => g.Apartment!)
                .HasForeignKey(g => g.ApartmentId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(a => a.Code);
        });

        modelBuilder.Entity<FooterLink>().HasIndex(f => new { f.Group, f.SortOrder });

        modelBuilder.Entity<Booking>(e =>
        {
            e.HasIndex(b => b.Status);
            e.HasIndex(b => b.CreatedAt);
        });

        modelBuilder.Entity<MediaScene>().HasIndex(m => m.Number).IsUnique();
        modelBuilder.Entity<MediaAsset>().HasIndex(m => m.FileName).IsUnique();
    }
}
