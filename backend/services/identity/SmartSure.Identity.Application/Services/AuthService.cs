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
        var token = _jwtTokenGenerator.GenerateToken(user.UserId, user.Email, roles);

        // Fire-and-forget — RabbitMQ unavailability must never block login
        _ = Task.Run(async () =>
        {
            try
            {
                await _publishEndpoint.Publish(new UserLoggedInEvent(user.UserId, user.Email, DateTime.UtcNow));
            }
            catch { /* swallow — non-critical */ }
        });

        return Result<LoginResponseDto>.Success(new LoginResponseDto(token, user.Email, user.FullName, roles.ToArray()));
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

            currentPassword.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            currentPassword.LastChangedAt = DateTime.UtcNow;

            await _userRepository.UpdateAsync(user);
            await _unitOfWork.SaveChangesAsync();

            await _tokenBlacklist.BlacklistTokenAsync(resetToken, TimeSpan.FromMinutes(15));

            return Result.Success();
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
}
