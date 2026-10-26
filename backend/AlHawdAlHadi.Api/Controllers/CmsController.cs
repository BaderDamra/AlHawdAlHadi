using System.Text.Json.Nodes;
using AlHawdAlHadi.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AlHawdAlHadi.Api.Controllers;

/// <summary>Website content managed from the dashboard.</summary>
[ApiController]
[Route("api/cms")]
[Produces("application/json")]
public sealed class CmsController(ICmsService cms) : ControllerBase
{
    private static readonly HashSet<string> ReservedSectionNames = ["reset"];

    /// <summary>Returns the full CMS document.</summary>
    [HttpGet]
    public async Task<ActionResult<JsonObject>> Get(CancellationToken ct) => Ok(await cms.GetDocumentAsync(ct));

    /// <summary>Replaces the whole CMS document.</summary>
    [HttpPut]
    public async Task<IActionResult> Put([FromBody] JsonObject? document, CancellationToken ct)
    {
        if (document is null || document["settings"] is not JsonObject || document["hero"] is not JsonObject)
            return BadRequest(new { error = "بيانات غير صالحة" });

        await cms.SaveDocumentAsync(document, ct);
        return Ok(new { success = true, data = await cms.GetDocumentAsync(ct) });
    }

    /// <summary>Replaces a single top-level section (e.g. <c>hero</c>, <c>projectsSection</c>).</summary>
    [HttpPatch("{section}")]
    public async Task<IActionResult> PatchSection(string section, [FromBody] JsonNode? content, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(section) || section.Length > 64 || ReservedSectionNames.Contains(section))
            return BadRequest(new { error = "اسم القسم غير صالح" });

        var saved = await cms.SaveSectionAsync(section, content, ct);
        return Ok(new { success = true, section, data = saved });
    }

    /// <summary>Restores factory default content.</summary>
    [HttpPost("reset")]
    public async Task<IActionResult> Reset(CancellationToken ct) =>
        Ok(new { success = true, data = await cms.ResetToDefaultsAsync(ct) });
}
