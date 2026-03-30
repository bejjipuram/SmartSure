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

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        if (!string.IsNullOrEmpty(purpose))
        {
            claims.Add(new Claim("purpose", purpose));
        }

        var rsaKey = new RsaSecurityKey(_rsa);
        var credentials = new SigningCredentials(rsaKey, SecurityAlgorithms.RsaSha256);

        int expiry = expiryMinutesOverride ?? _jwtSettings.ExpiryMinutes;

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(expiry),
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        
        return tokenHandler.WriteToken(token);
    }
}
