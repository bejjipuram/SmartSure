using Microsoft.EntityFrameworkCore;
using SmartSure.Identity.Application.Interfaces;
using SmartSure.Identity.Domain.Entities;
using SmartSure.Identity.Infrastructure.Data;
using SmartSure.Shared.Common.Models;

namespace SmartSure.Identity.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IdentityDbContext _context;

    public UserRepository(IdentityDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Include(u => u.Passwords)
            .FirstOrDefaultAsync(u => u.UserId == id);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Include(u => u.Passwords)
            .FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<User?> GetByVerificationTokenAsync(string token)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.VerificationToken == token && u.VerificationTokenExpiry > DateTime.UtcNow);
    }

    public async Task AddAsync(User user)
    {
        await _context.Users.AddAsync(user);
    }

    public Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        return Task.CompletedTask;
    }

    public async Task ReplaceRoleAsync(Guid userId, int newRoleId)
    {
        var existing = await _context.UserRoles.FirstOrDefaultAsync(ur => ur.UserId == userId);
        if (existing != null)
        {
            existing.RoleId = newRoleId;
        }
        else
        {
            // Fallback: user has no role row yet, insert one
            _context.UserRoles.Add(new UserRole { UserId = userId, RoleId = newRoleId });
        }
    }

    public async Task<PagedResult<User>> GetPagedAsync(int page, int pageSize, string? role, bool? isActive)
    {
        var query = _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        if (!string.IsNullOrEmpty(role))
        {
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role!.Name == role));
        }

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(u => u.CreatedAt)
                               .Skip((page - 1) * pageSize)
                               .Take(pageSize)
                               .ToListAsync();

        return new PagedResult<User>
        {
            TotalCount = total,
            Items = items,
            Page = page,
            PageSize = pageSize
        };
    }
}
