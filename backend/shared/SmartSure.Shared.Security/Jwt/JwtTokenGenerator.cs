using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace SmartSure.Shared.Security.Jwt;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly JwtSettings _jwtSettings;
    private readonly RSA _rsa;

    public JwtTokenGenerator(IOptions<JwtSettings> jwtOptions, RSA rsaKey)
    {
        _jwtSettings = jwtOptions.Value;
        _rsa = rsaKey;
    }

    public string GenerateToken(Guid userId, string email, IList<string> roles, string? purpose = null, int? expiryMinutesOverride = null)
{

    var claims = new List<Claim>
    {
        new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
        new Claim(JwtRegisteredClaimNames.Email, email),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
    };

    // Add a single 'role' claim with all roles (comma-separated) for compatibility
    if (roles != null && roles.Count > 0)
    {
        claims.Add(new Claim("role", string.Join(",", roles)));
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }
    }

    if (!string.IsNullOrEmpty(purpose))
    {
        claims.Add(new Claim("purpose", purpose));
    }

    // Add audience claim if present
    if (!string.IsNullOrEmpty(_jwtSettings.Audience))
    {
        claims.Add(new Claim(JwtRegisteredClaimNames.Aud, _jwtSettings.Audience));
    }

    var rsaKey = new RsaSecurityKey(_rsa);
    var credentials = new SigningCredentials(rsaKey, SecurityAlgorithms.RsaSha256);

    int expiry = expiryMinutesOverride ?? _jwtSettings.ExpiryMinutes;

    var token = new JwtSecurityToken(
        issuer: _jwtSettings.Issuer,
        claims: claims,
        expires: DateTime.UtcNow.AddMinutes(expiry),
        signingCredentials: credentials
    );

    var tokenHandler = new JwtSecurityTokenHandler();
    return tokenHandler.WriteToken(token);
}

    public string GenerateRefreshToken(Guid userId, string email, int expiryMinutes)
    {
        // Generate a secure random string (Base64Url, 32 bytes = 256 bits)
        var bytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }
        return Base64UrlEncoder.Encode(bytes);
    }
}
