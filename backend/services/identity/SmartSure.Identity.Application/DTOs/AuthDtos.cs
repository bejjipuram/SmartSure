using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace SmartSure.Identity.Application.DTOs;

public record RegisterDto(
    [Required] [EmailAddress] string Email,
    [Required] string FullName,
    [Required] [MinLength(6)] string Password,
    string? Phone = null);

public record LoginDto(
    [Required] [EmailAddress] string Email, 
    [Required] string Password);

public record LoginResponseDto(
    [property: JsonPropertyName("accessToken")] string AccessToken,
    [property: JsonPropertyName("refreshToken")] string RefreshToken,
    [property: JsonPropertyName("email")] string Email,
    [property: JsonPropertyName("fullName")] string FullName,
    [property: JsonPropertyName("roles")] string[] Roles);

public record RefreshTokenDto(
    [Required] string RefreshToken);

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
