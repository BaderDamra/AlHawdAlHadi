using System.Text.RegularExpressions;
using AlHawdAlHadi.Api.Contracts;
using AlHawdAlHadi.Api.Data;
using AlHawdAlHadi.Api.Data.Entities;
using AlHawdAlHadi.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

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
    public const long MaxBytes = 15 * 1024 * 1024; // 15 MB

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
        if (file.Length > MaxBytes) throw new MediaValidationException("حجم الصورة يتجاوز 15 ميجابايت");

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
        if (bytes.Length > MaxBytes) throw new MediaValidationException("حجم الصورة يتجاوز 15 ميجابايت");
        if (!spec.Signatures.Any(sig => bytes.AsSpan().StartsWith(sig)))
            throw new MediaValidationException("محتوى الملف لا يطابق نوع الصورة");

        var baseName = UnsafeChars().Replace(Path.GetFileNameWithoutExtension(originalName ?? "image"), "-");
        if (baseName.Length > 40) baseName = baseName[..40];
        if (string.IsNullOrWhiteSpace(baseName.Trim('-'))) baseName = "asset";

        var finalName = $"{baseName}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}.{spec.Ext}";
        Directory.CreateDirectory(paths.UploadsDirectory);
        await File.WriteAllBytesAsync(Path.Combine(paths.UploadsDirectory, finalName), bytes, ct);

        var asset = new MediaAsset
        {
            FileName = finalName,
            OriginalName = originalName ?? finalName,
            Url = $"/images/uploads/{finalName}",
            ContentType = contentType.ToLowerInvariant(),
            SizeBytes = bytes.Length,
            UploadedAt = DateTime.UtcNow
        };
        db.MediaAssets.Add(asset);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Uploaded media asset {File} ({Bytes} bytes)", finalName, bytes.Length);
        return new MediaUploadDto(asset.Id, asset.FileName, asset.Url, asset.SizeBytes, asset.UploadedAt);
    }
}
