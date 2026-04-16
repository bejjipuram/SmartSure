using Moq;
using NUnit.Framework;
using FluentAssertions;
using SmartSure.Identity.Application.Services;
using SmartSure.Identity.Application.Interfaces;
using SmartSure.Identity.Domain.Entities;
using SmartSure.Shared.Common.Models;
using MassTransit;

namespace SmartSure.Identity.Tests;

[TestFixture]
public class AdminUserServiceTests
{
    private Mock<IUserRepository> _userRepoMock;
    private Mock<IRoleRepository> _roleRepoMock;
    private Mock<IUnitOfWork> _uowMock;
    private Mock<IBus> _busMock;
    private AdminUserService _service;

    [SetUp]
    public void SetUp()
    {
        _userRepoMock = new Mock<IUserRepository>();
        _roleRepoMock = new Mock<IRoleRepository>();
        _uowMock = new Mock<IUnitOfWork>();
        _busMock = new Mock<IBus>();

        _service = new AdminUserService(
            _userRepoMock.Object,
            _roleRepoMock.Object,
            _uowMock.Object,
            _busMock.Object
        );
    }

    [Test]
    public async Task AssignRoleAsync_ShouldSucceed_WhenValid()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var roleName = "Admin";
        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(new User { UserId = userId });
        _roleRepoMock.Setup(r => r.GetByNameAsync(roleName)).ReturnsAsync(new Role { RoleId = 2, Name = roleName });

        // Act
        var result = await _service.AssignRoleAsync(userId, roleName);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _userRepoMock.Verify(r => r.ReplaceRoleAsync(userId, 2), Times.Once);
        _uowMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Test]
    public async Task AssignRoleAsync_ShouldFail_WhenUserNotFound()
    {
        // Arrange
        _userRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((User)null);

        // Act
        var result = await _service.AssignRoleAsync(Guid.NewGuid(), "Admin");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("User not found.");
    }

    [Test]
    public async Task RevokeRoleAsync_ShouldFail_WhenRevokingLastRole()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User { UserId = userId };
        user.UserRoles.Add(new UserRole { Role = new Role { Name = "Policyholder" } });
        
        _userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);

        // Act
        var result = await _service.RevokeRoleAsync(userId, "Policyholder");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("Cannot revoke the last role. Every user must have at least one role.");
    }
}
