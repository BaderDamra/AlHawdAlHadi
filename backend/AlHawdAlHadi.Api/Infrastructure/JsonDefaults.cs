using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;

namespace AlHawdAlHadi.Api.Infrastructure;

public static class JsonDefaults
{
    /// <summary>Shared serializer options (camelCase, readable Arabic, tolerant to number/string mix-ups).</summary>
    public static readonly JsonSerializerOptions Options = Configure(new JsonSerializerOptions(JsonSerializerDefaults.Web));

    public static JsonSerializerOptions Configure(JsonSerializerOptions o)
    {
        o.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        o.PropertyNameCaseInsensitive = true;
        o.NumberHandling = JsonNumberHandling.AllowReadingFromString;
        o.Encoder = JavaScriptEncoder.Create(UnicodeRanges.All);
        if (!o.Converters.OfType<FlexibleStringConverter>().Any())
        {
            o.Converters.Add(new FlexibleStringConverter());
        }
        return o;
    }
}

/// <summary>
/// Accepts numbers / booleans where a string is expected (HTML number inputs in the
/// admin dashboard may send <c>4</c> instead of <c>"4"</c>).
/// </summary>
public sealed class FlexibleStringConverter : JsonConverter<string>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.String => reader.GetString(),
            JsonTokenType.Number => reader.TryGetInt64(out var l) ? l.ToString() : reader.GetDouble().ToString(System.Globalization.CultureInfo.InvariantCulture),
            JsonTokenType.True => "true",
            JsonTokenType.False => "false",
            JsonTokenType.Null => null,
            _ => throw new JsonException($"Unexpected token {reader.TokenType} for string value.")
        };

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value);
}
