using System.ComponentModel.DataAnnotations;

namespace SmartSure.Identity.Application.DTOs;

public record RegisterDto(
    [Required] [EmailAddress] string Email, 
    [Required] string FullName, 
    [Required] [MinLength(6)] string Password);

public record LoginDto(
    [Required] [EmailAddress] string Email, 
    [Required] string Password);

public record LoginResponseDto(string AccessToken, string Email, string FullName, string[] Roles);

public record VerifyOtpDto(
    [Required] [EmailAddress] string Email, 
    [Required] string OtpCode);

public record ResetPasswordDto(
    [Required] [EmailAddress] string Email, 
    [Required] [MinLength(6)] string NewPassword);

public record UpdateProfileDto(
    [Required] string FullName, 
    string? Phone, 
    string? Address);

public record UserProfileDto(Guid UserId, string FullName, string Email, string? Phone, string? Address, bool IsEmailVerified);

public record ChangePasswordDto(
    [Required] string CurrentPassword, 
    [Required] [MinLength(6)] string NewPassword);

public record AssignRoleDto(
    [Required] string RoleName);
