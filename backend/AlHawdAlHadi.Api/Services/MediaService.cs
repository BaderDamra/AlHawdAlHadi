using System.Text.RegularExpressions;
using AlHawdAlHadi.Api.Contracts;
using AlHawdAlHadi.Api.Data;
using AlHawdAlHadi.Api.Data.Entities;
using AlHawdAlHadi.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace AlHawdAlHadi.Api.Services;

public interface IMediaService
{
    Task<MediaCatalogDto> GetCatalogAsync(CancellationToken ct = default);
    Task<MediaUploadDto> SaveDataUrlAsync(string? fileName, string dataUrl, CancellationToken ct = default);
    Task<MediaUploadDto> SaveFormFileAsync(IFormFile file, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
}

public sealed class MediaValidationException(string message) : Exception(message);

public sealed partial class MediaService(AppDbContext db, FrontendPaths paths, ILogger<MediaService> logger) : IMediaService
{
    public const long MaxBytes = 25 * 1024 * 1024; // 25 MB input allowed before auto-compression
    public const int MaxDimensionPx = 1920;        // Full HD+ / 2K max dimension without visual quality loss

    // SVG intentionally excluded: it can embed scripts (stored XSS).
    private static readonly Dictionary<string, (string Ext, byte[][] Signatures)> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/png"] = ("png", [[0x89, 0x50, 0x4E, 0x47]]),
        ["image/jpeg"] = ("jpg", [[0xFF, 0xD8, 0xFF]]),
        ["image/jpg"] = ("jpg", [[0xFF, 0xD8, 0xFF]]),
        ["image/webp"] = ("webp", [[0x52, 0x49, 0x46, 0x46]]),
        ["image/gif"] = ("gif", [[0x47, 0x49, 0x46, 0x38]])
    };

    [GeneratedRegex(@"^data:(image/[a-zA-Z0-9+.\-]+);base64,(.+)$", RegexOptions.Singleline)]
    private static partial Regex DataUrlRegex();

    [GeneratedRegex(@"[^a-zA-Z0-9_\-]")]
    private static partial Regex UnsafeChars();

    public async Task<MediaCatalogDto> GetCatalogAsync(CancellationToken ct = default)
    {
        var pairs = await db.MediaScenes.AsNoTracking().OrderBy(s => s.Number)
            .Select(s => new MediaPairDto($"scene-{s.Number}", s.Title, s.Category, s.LightUrl, s.DarkUrl))
            .ToListAsync(ct);

        var uploads = await db.MediaAssets.AsNoTracking().OrderByDescending(a => a.UploadedAt)
            .Select(a => new MediaUploadDto(a.Id, a.FileName, a.Url, a.SizeBytes, a.UploadedAt))
            .ToListAsync(ct);

        return new MediaCatalogDto(pairs, uploads);
    }

    public async Task<MediaUploadDto> SaveDataUrlAsync(string? fileName, string dataUrl, CancellationToken ct = default)
    {
        var match = DataUrlRegex().Match(dataUrl ?? string.Empty);
        if (!match.Success) throw new MediaValidationException("يرجى إرسال ملف صورة صالح");

        byte[] bytes;
        try { bytes = Convert.FromBase64String(match.Groups[2].Value); }
        catch (FormatException) { throw new MediaValidationException("تنسيق الصورة غير مدعوم"); }

        return await PersistAsync(fileName, match.Groups[1].Value, bytes, ct);
    }

    public async Task<MediaUploadDto> SaveFormFileAsync(IFormFile file, CancellationToken ct = default)
    {
        if (file.Length == 0) throw new MediaValidationException("الملف فارغ");
        if (file.Length > MaxBytes) throw new MediaValidationException("حجم الصورة يتجاوز الحد المسموح (25 ميجابايت)");

        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        return await PersistAsync(file.FileName, file.ContentType, ms.ToArray(), ct);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var asset = await db.MediaAssets.FindAsync([id], ct);
        if (asset is null) return false;

        var filePath = Path.Combine(paths.UploadsDirectory, asset.FileName);
        if (File.Exists(filePath)) File.Delete(filePath);

        db.MediaAssets.Remove(asset);
        await db.SaveChangesAsync(ct);
        return true;
    }

    private async Task<MediaUploadDto> PersistAsync(string? originalName, string contentType, byte[] bytes, CancellationToken ct)
    {
        if (!Allowed.TryGetValue(contentType, out var spec))
            throw new MediaValidationException("نوع الصورة غير مدعوم (PNG, JPG, WEBP, GIF فقط)");
        if (bytes.Length == 0) throw new MediaValidationException("الملف فارغ");
        if (bytes.Length > MaxBytes) throw new MediaValidationException("حجم الصورة يتجاوز الحد المسموح (25 ميجابايت)");
        if (!spec.Signatures.Any(sig => bytes.AsSpan().StartsWith(sig)))
            throw new MediaValidationException("محتوى الملف لا يطابق نوع الصورة");

        var finalBytes = bytes;
        var finalExt = spec.Ext;
        var finalContentType = contentType.ToLowerInvariant();

        // Automatically resize oversized dimensions (up to 1920px) and compress to WebP without visual quality loss
        if (!string.Equals(spec.Ext, "gif", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                using var image = Image.Load(bytes);
                image.Mutate(x => x.AutoOrient());

                bool needsResize = image.Width > MaxDimensionPx || image.Height > MaxDimensionPx;
                if (needsResize)
                {
                    image.Mutate(x => x.Resize(new ResizeOptions
                    {
                        Mode = ResizeMode.Max,
                        Size = new Size(MaxDimensionPx, MaxDimensionPx),
                        Sampler = KnownResamplers.Lanczos3
                    }));
                }

                await using var webpStream = new MemoryStream();
                var encoder = new WebpEncoder
                {
                    Quality = 85,
                    FileFormat = WebpFileFormatType.Lossy,
                    Method = WebpEncodingMethod.BestQuality
                };
                await image.SaveAsync(webpStream, encoder, ct);
                var bestWebpBytes = webpStream.ToArray();

                // For smaller graphics / CAD floorplans, also test Lossless WebP and pick whichever is smaller
                if (bytes.Length < 1500 * 1024)
                {
                    await using var losslessStream = new MemoryStream();
                    var losslessEncoder = new WebpEncoder
                    {
                        FileFormat = WebpFileFormatType.Lossless,
                        Method = WebpEncodingMethod.Default
                    };
                    await image.SaveAsync(losslessStream, losslessEncoder, ct);
                    if (losslessStream.Length > 0 && losslessStream.Length < bestWebpBytes.Length)
                    {
                        bestWebpBytes = losslessStream.ToArray();
                    }
                }

                // Always use WebP if we resized, or if WebP achieved smaller byte size than original
                if (needsResize || bestWebpBytes.Length < bytes.Length)
                {
                    finalBytes = bestWebpBytes;
                    finalExt = "webp";
                    finalContentType = "image/webp";
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "ImageSharp optimization skipped for {Name}; storing original bytes.", originalName);
            }
        }

        var baseName = UnsafeChars().Replace(Path.GetFileNameWithoutExtension(originalName ?? "image"), "-");
        if (baseName.Length > 40) baseName = baseName[..40];
        if (string.IsNullOrWhiteSpace(baseName.Trim('-'))) baseName = "asset";

        var finalName = $"{baseName}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.{finalExt}";
        Directory.CreateDirectory(paths.UploadsDirectory);
        await File.WriteAllBytesAsync(Path.Combine(paths.UploadsDirectory, finalName), finalBytes, ct);

        var asset = new MediaAsset
        {
            FileName = finalName,
            OriginalName = originalName ?? finalName,
            Url = $"/images/uploads/{finalName}",
            ContentType = finalContentType,
            SizeBytes = finalBytes.Length,
            UploadedAt = DateTime.UtcNow
        };
        db.MediaAssets.Add(asset);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Uploaded & optimized media asset {File} ({OrigBytes} -> {FinalBytes} bytes)", finalName, bytes.Length, finalBytes.Length);
        return new MediaUploadDto(asset.Id, asset.FileName, asset.Url, asset.SizeBytes, asset.UploadedAt);
    }
}
