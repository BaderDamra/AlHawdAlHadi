using AlHawdAlHadi.Api.Contracts;
using AlHawdAlHadi.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AlHawdAlHadi.Api.Controllers;

/// <summary>Media library: built-in Light/Dark scene pairs + uploaded images.</summary>
[ApiController]
[Produces("application/json")]
public sealed class MediaController(IMediaService media) : ControllerBase
{
    [HttpGet("api/media")]
    public async Task<ActionResult<MediaCatalogDto>> Catalog(CancellationToken ct) => Ok(await media.GetCatalogAsync(ct));

    /// <summary>Uploads an image sent as a base64 data URL (used by the dashboard).</summary>
    [HttpPost("api/upload")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<IActionResult> UploadDataUrl([FromBody] DataUrlUploadRequest request, CancellationToken ct)
    {
        try
        {
            var result = await media.SaveDataUrlAsync(request.Filename, request.DataUrl, ct);
            var origBytes = request.OriginalSize.GetValueOrDefault(result.SizeBytes);
            var savedPct = origBytes > result.SizeBytes && origBytes > 0
                ? Math.Round((1.0 - ((double)result.SizeBytes / origBytes)) * 100.0, 1)
                : 0.0;
            return Ok(new
            {
                success = true,
                id = result.Id,
                url = result.Url,
                filename = result.Filename,
                originalBytes = origBytes,
                compressedBytes = result.SizeBytes,
                savedPercent = savedPct
            });
        }
        catch (MediaValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Uploads an image as <c>multipart/form-data</c> (field name: <c>file</c>).</summary>
    [HttpPost("api/media")]
    [RequestSizeLimit(MediaService.MaxBytes + 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadForm(IFormFile file, CancellationToken ct)
    {
        try
        {
            var result = await media.SaveFormFileAsync(file, ct);
            return Ok(new { success = true, id = result.Id, url = result.Url, filename = result.Filename });
        }
        catch (MediaValidationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("api/media/{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) =>
        await media.DeleteAsync(id, ct) ? Ok(new { success = true }) : NotFound(new { error = "الصورة غير موجودة" });
}
