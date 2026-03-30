using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSure.Identity.Application.DTOs;
using SmartSure.Identity.Application.Interfaces;
using SmartSure.Shared.Common.Constants;

namespace SmartSure.Identity.API.Controllers;

[ApiController]
[Route("api/auth/users")]
[Authorize(Roles = Roles.Admin)]
public class AdminUserController : ControllerBase
{
    private readonly IAdminUserService _adminService;

    public AdminUserController(IAdminUserService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 10,
        [FromQuery] string? role = null,
        [FromQuery] bool? isActive = null)
    {
        var result = await _adminService.GetUsersAsync(page, pageSize, role, isActive);
        return Ok(result);
    }

    [HttpPut("{userId}/roles")]
    public async Task<IActionResult> AssignRole(Guid userId, [FromBody] AssignRoleDto dto)
    {
        var result = await _adminService.AssignRoleAsync(userId, dto.RoleName);
        if (!result.IsSuccess) return BadRequest(new { result.ErrorMessage });
        return Ok(new { Message = "Role assigned successfully." });
    }

    [HttpDelete("{userId}/roles/{roleName}")]
    public async Task<IActionResult> RevokeRole(Guid userId, string roleName)
    {
        var result = await _adminService.RevokeRoleAsync(userId, roleName);
        if (!result.IsSuccess) return BadRequest(new { result.ErrorMessage });
        return Ok(new { Message = "Role revoked successfully." });
    }
}
