using SmartSure.Identity.Application.DTOs;
using SmartSure.Shared.Common.Models;

namespace SmartSure.Identity.Application.Interfaces;

public interface IAuthService
{
    Task<Result> RegisterAsync(RegisterDto dto);
    Task<Result> RegisterWithOtpAsync(RegisterDto dto);
    Task<Result<LoginResponseDto>> LoginAsync(LoginDto dto);
    Task<Result> LogoutAsync(Guid userId, string token);
    Task<Result> VerifyEmailAsync(string token);
    Task<Result> ResendVerificationEmailAsync(string email);
    Task<Result> ResendVerificationOtpAsync(string email);
    Task<Result> ForgotPasswordAsync(string email);
    Task<Result<string>> VerifyOtpAsync(VerifyOtpDto dto); // Returns a purpose-scoped reset JWT
    Task<Result> VerifyRegistrationOtpAsync(VerifyOtpDto dto);
    Task<Result> ResetPasswordAsync(ResetPasswordDto dto, string resetToken);
    Task<Result<UserProfileDto>> GetProfileAsync(Guid userId);
    Task<Result> UpdateProfileAsync(Guid userId, UpdateProfileDto dto);
    Task<Result> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    Task<Result<LoginResponseDto>> HandleGoogleCallbackAsync(string authorizationCode);
    // Stateless refresh token endpoint
    Task<Result<LoginResponseDto>> RefreshTokenAsync(string refreshToken);
}
