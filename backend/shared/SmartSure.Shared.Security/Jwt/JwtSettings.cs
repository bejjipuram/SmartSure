namespace SmartSure.Shared.Security.Jwt;

public class JwtSettings
{
    public const string SectionName = "JwtSettings";
    public string Issuer { get; init; } = null!;
    public string Audience { get; init; } = null!;
    // RS256 requires paths to keys or raw key string
    public string PrivateKeyContent { get; init; } = null!;
    public string PublicKeyContent { get; init; } = null!;
    public int ExpiryMinutes { get; init; } = 60;
}
