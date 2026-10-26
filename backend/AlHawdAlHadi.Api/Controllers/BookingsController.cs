using AlHawdAlHadi.Api.Contracts;
using AlHawdAlHadi.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AlHawdAlHadi.Api.Controllers;

/// <summary>Viewing appointment requests (CRM).</summary>
[ApiController]
[Route("api/bookings")]
[Produces("application/json")]
public sealed class BookingsController(IBookingService bookings) : ControllerBase
{
    /// <summary>Lists bookings, newest first. Optional filters: <c>status</c>, <c>q</c>.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BookingDto>>> List([FromQuery] string? status, [FromQuery] string? q, CancellationToken ct) =>
        Ok(await bookings.ListAsync(status, q, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BookingDto>> Get(int id, CancellationToken ct) =>
        await bookings.GetAsync(id, ct) is { } b ? Ok(b) : NotFound(new { error = "الطلب غير موجود" });

    /// <summary>Creates a booking from the public website form.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBookingRequest request, CancellationToken ct)
    {
        var booking = await bookings.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = booking.Id }, new { success = true, booking });
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBookingRequest request, CancellationToken ct)
    {
        try
        {
            var booking = await bookings.UpdateAsync(id, request, ct);
            return booking is null ? NotFound(new { error = "الطلب غير موجود" }) : Ok(new { success = true, booking });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) =>
        await bookings.DeleteAsync(id, ct) ? Ok(new { success = true }) : NotFound(new { error = "الطلب غير موجود" });
}
