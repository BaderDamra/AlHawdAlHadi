using AlHawdAlHadi.Api.Contracts;
using AlHawdAlHadi.Api.Data;
using AlHawdAlHadi.Api.Data.Entities;
using AlHawdAlHadi.Api.Mapping;
using Microsoft.EntityFrameworkCore;

namespace AlHawdAlHadi.Api.Services;

public interface IBookingService
{
    Task<IReadOnlyList<BookingDto>> ListAsync(string? status, string? search, CancellationToken ct = default);
    Task<BookingDto?> GetAsync(int id, CancellationToken ct = default);
    Task<BookingDto> CreateAsync(CreateBookingRequest request, CancellationToken ct = default);
    Task<BookingDto?> UpdateAsync(int id, UpdateBookingRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
}

public sealed class BookingService(AppDbContext db) : IBookingService
{
    public async Task<IReadOnlyList<BookingDto>> ListAsync(string? status, string? search, CancellationToken ct = default)
    {
        var query = db.Bookings.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
            query = query.Where(b => b.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim();
            query = query.Where(b => b.Name.Contains(q) || b.Phone.Contains(q) || b.Project.Contains(q) || b.Email.Contains(q));
        }

        var list = await query.OrderByDescending(b => b.CreatedAt).ToListAsync(ct);
        return list.Select(b => b.ToDto()).ToList();
    }

    public async Task<BookingDto?> GetAsync(int id, CancellationToken ct = default) =>
        (await db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct))?.ToDto();

    public async Task<BookingDto> CreateAsync(CreateBookingRequest r, CancellationToken ct = default)
    {
        var booking = new Booking
        {
            Name = r.Name.Trim(),
            Phone = r.Phone.Trim(),
            Email = r.Email?.Trim() ?? string.Empty,
            Project = string.IsNullOrWhiteSpace(r.Project) ? "مشروع الهدوء 2" : r.Project.Trim(),
            Unit = string.IsNullOrWhiteSpace(r.Unit) ? "شقة - A" : r.Unit.Trim(),
            PreferredDate = r.PreferredDate?.Trim() ?? string.Empty,
            PreferredTime = r.PreferredTime?.Trim() ?? string.Empty,
            Notes = r.Notes?.Trim() ?? string.Empty,
            Status = BookingStatuses.New,
            CreatedAt = DateTime.UtcNow
        };

        db.Bookings.Add(booking);
        await db.SaveChangesAsync(ct);
        return booking.ToDto();
    }

    public async Task<BookingDto?> UpdateAsync(int id, UpdateBookingRequest r, CancellationToken ct = default)
    {
        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) return null;

        if (r.Status is not null)
        {
            if (!BookingStatuses.All.Contains(r.Status))
                throw new ArgumentException("حالة الحجز غير صالحة");
            booking.Status = r.Status;
        }
        if (r.Notes is not null) booking.Notes = r.Notes.Trim();
        if (r.PreferredDate is not null) booking.PreferredDate = r.PreferredDate.Trim();
        if (r.PreferredTime is not null) booking.PreferredTime = r.PreferredTime.Trim();

        booking.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return booking.ToDto();
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default) =>
        await db.Bookings.Where(b => b.Id == id).ExecuteDeleteAsync(ct) > 0;
}
