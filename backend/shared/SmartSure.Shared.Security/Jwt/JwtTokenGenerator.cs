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

        // Add 'role' claim as a single string (first role if multiple)
        if (roles != null && roles.Count > 0)
        {
            claims.Add(new Claim("role", roles[0]));
        }

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


        // If multiple audiences, use JwtSecurityToken directly to set 'aud' as array in payload
        if (_jwtSettings.Audiences != null && _jwtSettings.Audiences.Length > 1)
        {
            var now = DateTime.UtcNow;
            var jwt = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: null, // don't set single audience
                claims: claims,
                notBefore: now,
                expires: now.AddMinutes(expiry),
                signingCredentials: credentials
            );
            // Overwrite 'aud' claim in payload as array
            var payload = jwt.Payload;
            payload[JwtRegisteredClaimNames.Aud] = _jwtSettings.Audiences;
            var handler = new JwtSecurityTokenHandler();
            return handler.WriteToken(jwt);
        }
        else
        {
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(expiry),
                Issuer = _jwtSettings.Issuer,
                Audience = _jwtSettings.Audiences != null && _jwtSettings.Audiences.Length == 1 ? _jwtSettings.Audiences[0] : _jwtSettings.Audience,
                SigningCredentials = credentials
            };
            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    public string GenerateRefreshToken(Guid userId)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("purpose", "refresh")
        };

        // ✅ ADD THIS
        var rsaKey = new RsaSecurityKey(_rsa);
        var credentials = new SigningCredentials(rsaKey, SecurityAlgorithms.RsaSha256);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7),
            Issuer = _jwtSettings.Issuer,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}
