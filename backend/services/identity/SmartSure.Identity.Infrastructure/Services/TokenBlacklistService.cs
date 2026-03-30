using Microsoft.Extensions.Caching.Memory;
using SmartSure.Identity.Application.Interfaces;

namespace SmartSure.Identity.Infrastructure.Services;

public class TokenBlacklistService : ITokenBlacklistService
{
    private readonly IMemoryCache _cache;

    public TokenBlacklistService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public Task BlacklistTokenAsync(string token, TimeSpan expiry)
    {
        _cache.Set($"blacklist:{token}", true, expiry);
        return Task.CompletedTask;
    }

    public Task<bool> IsBlacklistedAsync(string token)
    {
        return Task.FromResult(_cache.TryGetValue($"blacklist:{token}", out _));
    }
}
