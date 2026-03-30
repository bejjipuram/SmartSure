using SmartSure.Identity.Domain.Entities;
using SmartSure.Shared.Common.Models;

namespace SmartSure.Identity.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByVerificationTokenAsync(string token);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task<PagedResult<User>> GetPagedAsync(int page, int pageSize, string? role, bool? isActive);
    Task ReplaceRoleAsync(Guid userId, int newRoleId);
}

public interface IRoleRepository
{
    Task<Role?> GetByNameAsync(string name);
}

public interface IOtpRepository
{
    Task<OtpRecord?> GetByEmailAsync(string email);
    Task AddAsync(OtpRecord record);
    Task UpdateAsync(OtpRecord record);
    Task DeleteAsync(OtpRecord record);
}

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

