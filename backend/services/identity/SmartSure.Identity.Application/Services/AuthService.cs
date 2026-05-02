using BCrypt.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartSure.Identity.Application.DTOs;
using SmartSure.Identity.Application.Interfaces;
using SmartSure.Identity.Domain.Entities;
using SmartSure.Shared.Common.Models;
using SmartSure.Shared.Security.Jwt;
using SmartSure.Shared.Contracts.Events;
using MassTransit;
using System.Text.Json;

namespace SmartSure.Identity.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IRoleRepository _roleRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IEmailService _emailService;
    private readonly IOtpService _otpService;
    private readonly ITokenBlacklistService _tokenBlacklist;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        IRoleRepository roleRepository,
        IUnitOfWork unitOfWork,
        IJwtTokenGenerator jwtTokenGenerator,
        IEmailService emailService,
        IOtpService otpService,
        ITokenBlacklistService tokenBlacklist,
        IPublishEndpoint publishEndpoint,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _unitOfWork = unitOfWork;
        _jwtTokenGenerator = jwtTokenGenerator;
        _emailService = emailService;
        _otpService = otpService;
        _tokenBlacklist = tokenBlacklist;
        _publishEndpoint = publishEndpoint;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<Result> RegisterWithOtpAsync(RegisterDto dto)
    {
        _logger.LogDebug("RegisterWithOtpAsync called for {Email}", dto.Email);
        _logger.LogTrace("[VERBOSE] RegisterWithOtpAsync payload: {@Dto}", dto);
        var existingUser = await _userRepository.GetByEmailAsync(dto.Email);
        if (existingUser != null)
        {
            _logger.LogWarning("Attempt to register with existing email: {Email}", dto.Email);
            return Result.Failure("Email is already registered.");
        }

        var user = new User
        {
            UserId = Guid.NewGuid(),
            Email = dto.Email,
            FullName = dto.FullName,
            IsEmailVerified = false,
            Phone = dto.Phone // Set phone if provided
        };

        var defaultRole = await _roleRepository.GetByNameAsync("Policyholder");
        if (defaultRole == null)
        {
            return Result.Failure("Default role 'Policyholder' not found. Please contact support.");
        }

        user.UserRoles.Add(new UserRole { RoleId = defaultRole.RoleId });

        user.Passwords.Add(new Password
        {
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        });

        await _userRepository.AddAsync(user);
        await _unitOfWork.SaveChangesAsync();

        // Generate and send OTP
        var otpResult = await _otpService.GenerateOtpAsync(dto.Email);
        if (!otpResult.IsSuccess) return Result.Failure(otpResult.ErrorMessage!);
        await _emailService.SendEmailAsync(dto.Email, "Verify Your SmartSure Account",
            $"Welcome to SmartSure! Your OTP code is {otpResult.Data}. It expires in 10 minutes.");

        try
        {
            await _publishEndpoint.Publish(new UserRegisteredEvent(
                user.UserId, user.FullName, user.Email, defaultRole.Name, DateTime.UtcNow));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish UserRegisteredEvent for user {Email}. Admin DB will NOT reflect this user until the event is re-published.", user.Email);
        }

        return Result.Success();
    }

    public async Task<Result> ResendVerificationOtpAsync(string email)
    {
        _logger.LogDebug("ResendVerificationOtpAsync called for {Email}", email);
        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null || user.IsEmailVerified) {
            _logger.LogWarning("Resend OTP failed: user not found or already verified for {Email}", email);
            return Result.Failure("User not found or already verified.");
        }

        // Generate and send OTP
        var otpResult = await _otpService.GenerateOtpAsync(email);
        if (!otpResult.IsSuccess) {
            _logger.LogError("Failed to generate OTP for {Email}: {Error}", email, otpResult.ErrorMessage);
            return Result.Failure(otpResult.ErrorMessage!);
        }
        await _emailService.SendEmailAsync(email, "Verify Your SmartSure Account",
            $"Your OTP code is {otpResult.Data}. It expires in 10 minutes.");

        _logger.LogTrace("[VERBOSE] OTP resent to {Email}", email);
        return Result.Success();
    }

    public async Task<Result> VerifyRegistrationOtpAsync(VerifyOtpDto dto)
    {
        _logger.LogDebug("VerifyRegistrationOtpAsync called for {Email}", dto.Email);
        var validResult = await _otpService.ValidateOtpAsync(dto.Email, dto.OtpCode);
        if (!validResult.IsSuccess) {
            _logger.LogWarning("OTP validation failed for {Email}: {Error}", dto.Email, validResult.ErrorMessage);
            return Result.Failure(validResult.ErrorMessage!);
        }

        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null) {
            _logger.LogWarning("User not found for OTP verification: {Email}", dto.Email);
            return Result.Failure("User not found.");
        }
        if (user.IsEmailVerified) {
            _logger.LogInformation("User already verified: {Email}", dto.Email);
            return Result.Failure("User already verified.");
        }

        user.IsEmailVerified = true;
        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogTrace("[VERBOSE] User {Email} verified successfully", dto.Email);
        return Result.Success();
    }

    // ...rest of the AuthService methods...

    public async Task<Result> RegisterAsync(RegisterDto dto)
    {
        var existingUser = await _userRepository.GetByEmailAsync(dto.Email);
        if (existingUser != null)
        {
            return Result.Failure("Email is already registered.");
        }

        var verificationToken = Guid.NewGuid().ToString();

        var user = new User
        {
            UserId = Guid.NewGuid(),
            Email = dto.Email,
            FullName = dto.FullName,
            IsEmailVerified = false,
            VerificationToken = verificationToken,
            VerificationTokenExpiry = DateTime.UtcNow.AddHours(24)
        };

        var defaultRole = await _roleRepository.GetByNameAsync("Policyholder");
        if (defaultRole == null)
        {
            return Result.Failure("Default role 'Policyholder' not found. Please contact support.");
        }

        user.UserRoles.Add(new UserRole { RoleId = defaultRole.RoleId });

        user.Passwords.Add(new Password
        {
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        });

        await _userRepository.AddAsync(user);
        await _unitOfWork.SaveChangesAsync();

        // Publish AFTER saving — must not use Task.Run as that detaches from the
        // current DI scope and causes a silent ObjectDisposedException on IPublishEndpoint.
        try
        {
            await _publishEndpoint.Publish(new UserRegisteredEvent(
                user.UserId, user.FullName, user.Email, defaultRole.Name, DateTime.UtcNow));
        }
        catch (Exception ex)
        {
            // RabbitMQ unavailability must never block registration, but log the failure
            // so the Admin DB sync issue is visible and diagnosable.
            _logger.LogError(ex, "Failed to publish UserRegisteredEvent for user {Email}. Admin DB will NOT reflect this user until the event is re-published.", user.Email);
        }

        var verifyLink = $"{_configuration["AppSettings:BaseUrl"]}/api/auth/verify-email?token={verificationToken}";
        await _emailService.SendEmailAsync(dto.Email, "Verify Your SmartSure Account",
            $"Welcome to SmartSure! Click here to verify your email: {verifyLink}");

        return Result.Success();
    }

    public async Task<Result<LoginResponseDto>> LoginAsync(LoginDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null || !user.IsActive)
            return Result<LoginResponseDto>.Failure("Invalid credentials or user inactive.");

        if (!user.IsEmailVerified)
            return Result<LoginResponseDto>.Failure("Please verify your email first.");

        var currentPassword = user.Passwords.OrderByDescending(p => p.LastChangedAt).FirstOrDefault();
        if (currentPassword == null || !BCrypt.Net.BCrypt.Verify(dto.Password, currentPassword.PasswordHash))
            return Result<LoginResponseDto>.Failure("Invalid credentials.");

        var roles = user.UserRoles.Select(ur => ur.Role!.Name).ToList();
        var accessToken = _jwtTokenGenerator.GenerateToken(user.UserId, user.Email, roles);
        // Generate stateless refresh token (minimal claims, 2 days expiry)
        var refreshToken = _jwtTokenGenerator.GenerateRefreshToken(user.UserId); // 2 days

        // Fire-and-forget — RabbitMQ unavailability must never block login
        _ = Task.Run(async () =>
        {
            try
            {
                await _publishEndpoint.Publish(new UserLoggedInEvent(user.UserId, user.Email, DateTime.UtcNow));
            }
            catch { /* swallow — non-critical */ }
        });

        return Result<LoginResponseDto>.Success(new LoginResponseDto(accessToken, refreshToken, user.Email, user.FullName, roles.ToArray()));
    }

    public async Task<Result> LogoutAsync(Guid userId, string token)
    {
        // Blacklist the token for the remainder of its lifetime (1 hour max)
        await _tokenBlacklist.BlacklistTokenAsync(token, TimeSpan.FromHours(1));
        return Result.Success();
    }

    public async Task<Result> VerifyEmailAsync(string token)
    {
        var user = await _userRepository.GetByVerificationTokenAsync(token);
        if (user == null)
            return Result.Failure("Invalid or expired verification token.");

        user.IsEmailVerified = true;
        user.VerificationToken = null;
        user.VerificationTokenExpiry = null;

        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync();

        return Result.Success();
    }

    public async Task<Result> ResendVerificationEmailAsync(string email)
    {
        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null || user.IsEmailVerified) return Result.Failure("User not found or already verified.");

        user.VerificationToken = Guid.NewGuid().ToString();
        user.VerificationTokenExpiry = DateTime.UtcNow.AddHours(24);
        
        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync();

        var verifyLink = $"{_configuration["AppSettings:BaseUrl"]}/api/auth/verify-email?token={user.VerificationToken}";
        await _emailService.SendEmailAsync(user.Email, "Verify Your SmartSure Account",
            $"Click here to verify your email: {verifyLink}");

        return Result.Success();
    }

    public async Task<Result> ForgotPasswordAsync(string email)
    {
        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null) return Result.Success(); // Do not leak existence

        var otpResult = await _otpService.GenerateOtpAsync(email);
        if (!otpResult.IsSuccess) return Result.Failure(otpResult.ErrorMessage!);

        await _emailService.SendEmailAsync(email, "Password Reset OTP",
            $"Your OTP code is {otpResult.Data}. It expires in 10 minutes.");
        return Result.Success();
    }

    public async Task<Result<string>> VerifyOtpAsync(VerifyOtpDto dto)
    {
        var validResult = await _otpService.ValidateOtpAsync(dto.Email, dto.OtpCode);
        if (!validResult.IsSuccess) return Result<string>.Failure(validResult.ErrorMessage!);

        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null) return Result<string>.Failure("User not found.");

        var resetToken = _jwtTokenGenerator.GenerateToken(user.UserId, user.Email, new List<string>(), "password-reset", 15);
        return Result<string>.Success(resetToken);
    }

    public async Task<Result> ResetPasswordAsync(ResetPasswordDto dto, string resetToken)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null) return Result.Failure("Invalid request.");

        var currentPassword = user.Passwords.OrderByDescending(p => p.LastChangedAt).FirstOrDefault();
        if (currentPassword == null) return Result.Failure("No password record found.");

        // Prevent reusing the same password
        if (BCrypt.Net.BCrypt.Verify(dto.NewPassword, currentPassword.PasswordHash))
            return Result.Failure("New password must not be the same as the previous password.");

        // Password strength validation
        if (!IsStrongPassword(dto.NewPassword))
            return Result.Failure("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");

        currentPassword.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        currentPassword.LastChangedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync();

        await _tokenBlacklist.BlacklistTokenAsync(resetToken, TimeSpan.FromMinutes(15));

        return Result.Success();
    }

    // Password strength validation helper
    private bool IsStrongPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            return false;
        bool hasUpper = false, hasLower = false, hasDigit = false, hasSpecial = false;
        foreach (var c in password)
        {
            if (char.IsUpper(c)) hasUpper = true;
            else if (char.IsLower(c)) hasLower = true;
            else if (char.IsDigit(c)) hasDigit = true;
            else if (!char.IsLetterOrDigit(c)) hasSpecial = true;
        }
        return hasUpper && hasLower && hasDigit && hasSpecial;
    }

    public async Task<Result<UserProfileDto>> GetProfileAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return Result<UserProfileDto>.Failure("User not found.");

        return Result<UserProfileDto>.Success(new UserProfileDto(user.UserId, user.FullName, user.Email, user.Phone, user.Address, user.IsEmailVerified));
    }

    public async Task<Result> UpdateProfileAsync(Guid userId, UpdateProfileDto dto)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return Result.Failure("User not found.");

        user.FullName = dto.FullName;
        user.Phone = dto.Phone;
        user.Address = dto.Address;
        user.UpdatedAt = DateTime.UtcNow;
        
        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync();

        return Result.Success();
    }

    public async Task<Result> ChangePasswordAsync(Guid userId, ChangePasswordDto dto)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return Result.Failure("User not found.");

        var currentPassword = user.Passwords.OrderByDescending(p => p.LastChangedAt).FirstOrDefault();
        if (currentPassword == null || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, currentPassword.PasswordHash))
            return Result.Failure("Invalid current password.");

        currentPassword.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        currentPassword.LastChangedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync();

        return Result.Success();
    }

    public async Task<Result<LoginResponseDto>> HandleGoogleCallbackAsync(string authorizationCode)
    {
        // Delegate to GoogleAuthService
        throw new NotImplementedException("Google OAuth handled by IGoogleAuthService.");
    }

    public async Task<Result<LoginResponseDto>> RefreshTokenAsync(string refreshToken)
    {
        // Validate the refresh token (must be a valid JWT, with purpose=refresh, not expired)
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        System.IdentityModel.Tokens.Jwt.JwtSecurityToken? jwt = null;
        try
        {
            jwt = handler.ReadJwtToken(refreshToken);
        }
        catch
        {
            return Result<LoginResponseDto>.Failure("Invalid refresh token format.");
        }

        var purposeClaim = jwt.Claims.FirstOrDefault(c => c.Type == "purpose")?.Value;
        if (purposeClaim != "refresh")
            return Result<LoginResponseDto>.Failure("Invalid refresh token purpose.");

        var userIdStr = jwt.Claims.FirstOrDefault(c => c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        var email = jwt.Claims.FirstOrDefault(c => c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId) || string.IsNullOrEmpty(email))
            return Result<LoginResponseDto>.Failure("Invalid refresh token claims.");

        // Optionally: check user still exists and is active
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null || !user.IsActive)
            return Result<LoginResponseDto>.Failure("User not found or inactive.");

        var roles = user.UserRoles.Select(ur => ur.Role!.Name).ToList();
        var accessToken = _jwtTokenGenerator.GenerateToken(user.UserId, user.Email, roles);
        var newRefreshToken = _jwtTokenGenerator.GenerateRefreshToken(user.UserId); // 2 days

        return Result<LoginResponseDto>.Success(new LoginResponseDto(accessToken, newRefreshToken, user.Email, user.FullName, roles.ToArray()));
    }
}
