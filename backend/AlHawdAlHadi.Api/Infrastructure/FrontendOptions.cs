namespace AlHawdAlHadi.Api.Infrastructure;

/// <summary>Configuration for the static HTML/CSS/JS front-end served by the API.</summary>
public sealed class FrontendOptions
{
    public const string SectionName = "Frontend";

    /// <summary>Path of the front-end folder (absolute, or relative to the API content root).</summary>
    public string RootPath { get; set; } = "../../frontend";

    /// <summary>Origins allowed to call the API when the front-end is hosted separately.</summary>
    public string[] AllowedOrigins { get; set; } = [];
}

/// <summary>Resolved absolute paths of the front-end folders.</summary>
public sealed class FrontendPaths(string root)
{
    public string Root { get; } = root;
    public string UploadsDirectory { get; } = Path.Combine(root, "images", "uploads");
}
