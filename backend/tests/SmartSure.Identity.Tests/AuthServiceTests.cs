using Moq;
using NUnit.Framework;
using FluentAssertions;
using SmartSure.Identity.Application.Services;
using SmartSure.Identity.Application.Interfaces;
using SmartSure.Identity.Application.DTOs;
using SmartSure.Identity.Domain.Entities;
using SmartSure.Shared.Common.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MassTransit;
using SmartSure.Shared.Security.Jwt;
using SmartSure.Shared.Contracts.Events;

namespace SmartSure.Identity.Tests;

[TestFixture]
public class AuthServiceTests
{
    private Mock<IUserRepository> _userRepoMock;
    private Mock<IRoleRepository> _roleRepoMock;
    private Mock<IUnitOfWork> _uowMock;
    private Mock<IJwtTokenGenerator> _jwtMock;
    private Mock<IEmailService> _emailMock;
    private Mock<IOtpService> _otpMock;
    private Mock<ITokenBlacklistService> _blacklistMock;
    private Mock<IPublishEndpoint> _publishMock;
    private Mock<IConfiguration> _configMock;
    private Mock<ILogger<AuthService>> _loggerMock;
    private AuthService _service;

    [SetUp]
    public void SetUp()
    {
        _userRepoMock = new Mock<IUserRepository>();
        _roleRepoMock = new Mock<IRoleRepository>();
        _uowMock = new Mock<IUnitOfWork>();
        _jwtMock = new Mock<IJwtTokenGenerator>();
        _emailMock = new Mock<IEmailService>();
        _otpMock = new Mock<IOtpService>();
        _blacklistMock = new Mock<ITokenBlacklistService>();
        _publishMock = new Mock<IPublishEndpoint>();
        _configMock = new Mock<IConfiguration>();
        _loggerMock = new Mock<ILogger<AuthService>>();

        _service = new AuthService(
            _userRepoMock.Object,
            _roleRepoMock.Object,
            _uowMock.Object,
            _jwtMock.Object,
            _emailMock.Object,
            _otpMock.Object,
            _blacklistMock.Object,
            _publishMock.Object,
            _configMock.Object,
            _loggerMock.Object
        );
    }

    [Test]
    public async Task RegisterWithOtpAsync_ShouldFail_WhenEmailExists()
    {
        // Arrange
        var dto = new RegisterDto("test@example.com", "Test", "Pass");
        _userRepoMock.Setup(r => r.GetByEmailAsync(dto.Email))
            .ReturnsAsync(new User());

        // Act
        var result = await _service.RegisterWithOtpAsync(dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("Email is already registered.");
    }

    [Test]
    public async Task RegisterWithOtpAsync_ShouldSucceed_WhenValid()
    {
        // Arrange
        var dto = new RegisterDto("new@example.com", "John Doe", "SecurePassword123!");
        _userRepoMock.Setup(r => r.GetByEmailAsync(dto.Email)).ReturnsAsync((User)null);
        _roleRepoMock.Setup(r => r.GetByNameAsync("Policyholder")).ReturnsAsync(new Role { RoleId = 1, Name = "Policyholder" });
        _otpMock.Setup(o => o.GenerateOtpAsync(dto.Email)).ReturnsAsync(Result<string>.Success("123456"));

        // Act
        var result = await _service.RegisterWithOtpAsync(dto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _userRepoMock.Verify(r => r.AddAsync(It.Is<User>(u => u.Email == dto.Email)), Times.Once);
        _uowMock.Verify(u => u.SaveChangesAsync(), Times.Once);
        _emailMock.Verify(e => e.SendEmailAsync(dto.Email, It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        _publishMock.Verify(p => p.Publish(It.IsAny<UserRegisteredEvent>(), default), Times.Once);
    }

    [Test]
    public async Task ResendVerificationOtpAsync_ShouldFail_WhenUserNotFound()
    {
        // Arrange
        _userRepoMock.Setup(r => r.GetByEmailAsync("none@test.com")).ReturnsAsync((User)null);

        // Act
        var result = await _service.ResendVerificationOtpAsync("none@test.com");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("User not found or already verified.");
    }

    [Test]
    public async Task VerifyRegistrationOtpAsync_ShouldSucceed_WhenValid()
    {
        // Arrange
        var dto = new VerifyOtpDto("test@test.com", "123456");
        var user = new User { Email = "test@test.com", IsEmailVerified = false };
        _otpMock.Setup(o => o.ValidateOtpAsync(dto.Email, dto.OtpCode)).ReturnsAsync(Result.Success());
        _userRepoMock.Setup(r => r.GetByEmailAsync(dto.Email)).ReturnsAsync(user);

        // Act
        var result = await _service.VerifyRegistrationOtpAsync(dto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        user.IsEmailVerified.Should().BeTrue();
        _uowMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Test]
    public async Task VerifyRegistrationOtpAsync_ShouldFail_WhenOtpInvalid()
    {
        // Arrange
        var dto = new VerifyOtpDto("test@test.com", "wrong");
        _otpMock.Setup(o => o.ValidateOtpAsync(dto.Email, dto.OtpCode)).ReturnsAsync(Result.Failure("Invalid OTP"));

        // Act
        var result = await _service.VerifyRegistrationOtpAsync(dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("Invalid OTP");
    }

    [Test]
    public async Task VerifyRegistrationOtpAsync_ShouldFail_WhenAlreadyVerified()
    {
        // Arrange
        var dto = new VerifyOtpDto("test@test.com", "123456");
        var user = new User { Email = "test@test.com", IsEmailVerified = true };
        _otpMock.Setup(o => o.ValidateOtpAsync(dto.Email, dto.OtpCode)).ReturnsAsync(Result.Success());
        _userRepoMock.Setup(r => r.GetByEmailAsync(dto.Email)).ReturnsAsync(user);

        // Act
        var result = await _service.VerifyRegistrationOtpAsync(dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("User already verified.");
    }

    [Test]
    public async Task LoginAsync_ShouldFail_WhenEmailNotVerified()
    {
        // Arrange
        var dto = new LoginDto("unverified@test.com", "Password");
        var user = new User { Email = dto.Email, IsEmailVerified = false, IsActive = true };
        _userRepoMock.Setup(r => r.GetByEmailAsync(dto.Email)).ReturnsAsync(user);

        // Act
        var result = await _service.LoginAsync(dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("Please verify your email first.");
    }

    [Test]
    public async Task LoginAsync_ShouldFail_WhenUserInactive()
    {
        // Arrange
        var dto = new LoginDto("inactive@test.com", "Password");
        var user = new User { Email = dto.Email, IsActive = false };
        _userRepoMock.Setup(r => r.GetByEmailAsync(dto.Email)).ReturnsAsync(user);

        // Act
        var result = await _service.LoginAsync(dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("Invalid credentials or user inactive.");
    }

    [Test]
    public async Task ForgotPasswordAsync_ShouldReturnSuccess_EvenIfUserNotFound()
    {
        // Arrange
        _userRepoMock.Setup(r => r.GetByEmailAsync("ghost@test.com")).ReturnsAsync((User)null);

        // Act
        var result = await _service.ForgotPasswordAsync("ghost@test.com");

        // Assert
        result.IsSuccess.Should().BeTrue(); // Fail silently to prevent user enum
        _otpMock.Verify(o => o.GenerateOtpAsync(It.IsAny<string>()), Times.Never);
    }
}
