using MassTransit;
using SmartSure.Identity.Application.DTOs;
using SmartSure.Identity.Application.Interfaces;
using SmartSure.Shared.Common.Models;
using SmartSure.Shared.Contracts.Events;

namespace SmartSure.Identity.Application.Services;

public class AdminUserService : IAdminUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IRoleRepository _roleRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IBus _bus;

    public AdminUserService(IUserRepository userRepository, IRoleRepository roleRepository, IUnitOfWork unitOfWork, IBus bus)
    {
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _unitOfWork = unitOfWork;
        _bus = bus;
    }

    public async Task<PagedResult<UserProfileDto>> GetUsersAsync(int page, int pageSize, string? role, bool? isActive)
    {
        var result = await _userRepository.GetPagedAsync(page, pageSize, role, isActive);
        
        var dtos = result.Items.Select(u => new UserProfileDto(
            u.UserId, u.FullName, u.Email, u.Phone, u.Address, u.IsEmailVerified
        ));

        return new PagedResult<UserProfileDto>
        {
            Items = dtos,
            Page = page,
            PageSize = pageSize,
            TotalCount = result.TotalCount
        };
    }

    public async Task<Result> AssignRoleAsync(Guid userId, string roleName)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return Result.Failure("User not found.");

        var newRole = await _roleRepository.GetByNameAsync(roleName);
        if (newRole == null) return Result.Failure("Role does not exist.");

        // Replace all existing roles with the new one (deletes old rows, inserts new)
        await _userRepository.ReplaceRoleAsync(userId, newRole.RoleId);
        await _unitOfWork.SaveChangesAsync();

        await _bus.Publish(new UserRoleChangedEvent(userId, roleName, DateTime.UtcNow));

        return Result.Success();
    }

    public async Task<Result> RevokeRoleAsync(Guid userId, string roleName)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return Result.Failure("User not found.");

        var roleMapping = user.UserRoles.FirstOrDefault(ur => ur.Role!.Name == roleName);
        if (roleMapping != null)
        {
            if (user.UserRoles.Count <= 1)
                return Result.Failure("Cannot revoke the last role. Every user must have at least one role.");

            user.UserRoles.Remove(roleMapping);
            await _userRepository.UpdateAsync(user);
            await _unitOfWork.SaveChangesAsync();
        }

        return Result.Success();
    }
}
