using System.Security.Claims;

namespace SmartSure.Shared.Security.Jwt;

public interface IJwtTokenGenerator
{
    string GenerateToken(Guid userId, string email, IList<string> roles, string? purpose = null, int? expiryMinutesOverride = null);
    string GenerateRefreshToken(Guid userId);
}
