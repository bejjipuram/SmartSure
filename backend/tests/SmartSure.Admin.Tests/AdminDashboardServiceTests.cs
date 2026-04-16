using Moq;
using NUnit.Framework;
using FluentAssertions;
using SmartSure.Admin.Application.Services;
using SmartSure.Admin.Application.Interfaces;
using SmartSure.Admin.Domain.Entities;
using SmartSure.Shared.Common.Models;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace SmartSure.Admin.Tests;

[TestFixture]
public class AdminDashboardServiceTests
{
    private Mock<IAdminRepository<AdminClaim>> _claimRepoMock;
    private Mock<IAdminRepository<AdminPolicy>> _policyRepoMock;
    private Mock<IAdminRepository<AdminUser>> _userRepoMock;
    private AdminDashboardService _service;

    [SetUp]
    public void SetUp()
    {
        _claimRepoMock = new Mock<IAdminRepository<AdminClaim>>();
        _policyRepoMock = new Mock<IAdminRepository<AdminPolicy>>();
        _userRepoMock = new Mock<IAdminRepository<AdminUser>>();

        _service = new AdminDashboardService(
            _claimRepoMock.Object,
            _policyRepoMock.Object,
            _userRepoMock.Object
        );
    }

    [Test]
    public async Task GetDashboardKpisAsync_ShouldCalculateTotalRevenue()
    {
        // Arrange
        var policies = new List<AdminPolicy>
        {
            new AdminPolicy { PremiumAmount = 1000 },
            new AdminPolicy { PremiumAmount = 2500 }
        };
        _policyRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(policies);
        _claimRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminClaim>());
        _userRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminUser>());

        // Act
        var result = await _service.GetDashboardKpisAsync();

        // Assert
        result.TotalRevenue.Should().Be(3500);
        result.TotalPolicies.Should().Be(2);
    }

    [Test]
    public async Task GetDashboardKpisAsync_ShouldCountPendingClaims()
    {
        // Arrange
        var claims = new List<AdminClaim>
        {
            new AdminClaim { Status = "Submitted" },
            new AdminClaim { Status = "Approved" },
            new AdminClaim { Status = "Submitted" }
        };
        _claimRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(claims);
        _policyRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminPolicy>());
        _userRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminUser>());

        // Act
        var result = await _service.GetDashboardKpisAsync();

        // Assert
        result.PendingClaims.Should().Be(2);
        result.TotalClaims.Should().Be(3);
    }

    [Test]
    public async Task GetDashboardKpisAsync_ShouldCountActiveUsers()
    {
        // Arrange
        var users = new List<AdminUser>
        {
            new AdminUser { IsActive = true },
            new AdminUser { IsActive = false }
        };
        _userRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(users);
        _claimRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminClaim>());
        _policyRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminPolicy>());

        // Act
        var result = await _service.GetDashboardKpisAsync();

        // Assert
        result.ActiveUsers.Should().Be(1);
    }
}

[TestFixture]
public class AdminAuditLogServiceTests
{
    private Mock<IAdminRepository<AuditLog>> _logRepoMock;
    private Mock<IAdminRepository<AdminUser>> _userRepoMock;
    private Mock<IUnitOfWork> _uowMock;
    private Mock<IHttpContextAccessor> _httpMock;
    private AdminAuditLogService _service;

    [SetUp]
    public void SetUp()
    {
        _logRepoMock = new Mock<IAdminRepository<AuditLog>>();
        _userRepoMock = new Mock<IAdminRepository<AdminUser>>();
        _uowMock = new Mock<IUnitOfWork>();
        _httpMock = new Mock<IHttpContextAccessor>();

        _service = new AdminAuditLogService(
            _logRepoMock.Object,
            _userRepoMock.Object,
            _uowMock.Object,
            _httpMock.Object
        );
    }

    [Test]
    public async Task LogActionAsync_ShouldCreateAuditLogEntry()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var context = new DefaultHttpContext();
        var claims = new List<Claim> { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        context.User = new ClaimsPrincipal(new ClaimsIdentity(claims));
        _httpMock.Setup(h => h.HttpContext).Returns(context);

        // Act
        await _service.LogActionAsync("Test Action", "Policy", "1", "Reduced premium");

        // Assert
        _logRepoMock.Verify(r => r.AddAsync(It.Is<AuditLog>(l => 
            l.UserId == userId && 
            l.Action == "Test Action" && 
            l.EntityName == "Policy"
        )), Times.Once);
        _uowMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }
}
