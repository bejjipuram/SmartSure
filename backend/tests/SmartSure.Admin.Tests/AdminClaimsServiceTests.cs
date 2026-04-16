using Moq;
using NUnit.Framework;
using FluentAssertions;
using SmartSure.Admin.Application.Services;
using SmartSure.Admin.Application.Interfaces;
using SmartSure.Admin.Application.DTOs;
using SmartSure.Admin.Domain.Entities;
using SmartSure.Shared.Common.Models;
using SmartSure.Shared.Contracts.Events;
using Microsoft.Extensions.Logging;
using MassTransit;

namespace SmartSure.Admin.Tests;

[TestFixture]
public class AdminClaimsServiceTests
{
    private Mock<IAdminRepository<AdminClaim>> _claimRepoMock;
    private Mock<IAdminRepository<AdminUser>> _userRepoMock;
    private Mock<IUnitOfWork> _uowMock;
    private Mock<IAdminAuditLogService> _auditLogMock;
    private Mock<IBus> _busMock;
    private Mock<ILogger<AdminClaimsService>> _loggerMock;
    private AdminClaimsService _service;

    [SetUp]
    public void SetUp()
    {
        _claimRepoMock = new Mock<IAdminRepository<AdminClaim>>();
        _userRepoMock = new Mock<IAdminRepository<AdminUser>>();
        _uowMock = new Mock<IUnitOfWork>();
        _auditLogMock = new Mock<IAdminAuditLogService>();
        _busMock = new Mock<IBus>();
        _loggerMock = new Mock<ILogger<AdminClaimsService>>();

        _service = new AdminClaimsService(
            _claimRepoMock.Object,
            _userRepoMock.Object,
            _uowMock.Object,
            _auditLogMock.Object,
            _busMock.Object
        );
    }

    [Test]
    public async Task GetClaimsAsync_ShouldResolveCustomerNames_UsingUserRepo()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var claims = new List<AdminClaim>
        {
            new AdminClaim { Id = 1, UserId = userId, CustomerName = "Unknown" }
        };

        var users = new List<AdminUser>
        {
            new AdminUser { UserId = userId, FullName = "Resolved Name" }
        };

        _claimRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(claims);
        _userRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(users);

        // Act
        var result = await _service.GetClaimsAsync(null, null, null, 1, 10);

        // Assert
        result.Items.Should().HaveCount(1);
        result.Items.First().CustomerName.Should().Be("Resolved Name");
    }

    [Test]
    public async Task MarkAsUnderReviewAsync_ShouldUpdateStatusAndPublishEvent()
    {
        // Arrange
        var claimId = 123;
        var claim = new AdminClaim { ClaimId = claimId, Status = "Submitted", PolicyId = Guid.NewGuid() };
        _claimRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminClaim> { claim });

        // Act
        var result = await _service.MarkAsUnderReviewAsync(claimId, "Reviewing docs");

        // Assert
        result.Should().BeTrue();
        claim.Status.Should().Be("Under Review");
        _uowMock.Verify(u => u.SaveChangesAsync(), Times.Once);
        _auditLogMock.Verify(a => a.LogActionAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        _busMock.Verify(b => b.Publish(It.IsAny<ClaimStatusChangedEvent>(), default), Times.Once);
    }

    [Test]
    public async Task ApproveClaimAsync_ShouldUpdateStatusAndPublishEvent()
    {
        // Arrange
        var claimId = 456;
        var claim = new AdminClaim { ClaimId = claimId, Status = "Under Review", PolicyId = Guid.NewGuid(), UserId = Guid.NewGuid(), ClaimAmount = 5000 };
        _claimRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminClaim> { claim });

        // Act
        var result = await _service.ApproveClaimAsync(claimId, "Approved!");

        // Assert
        result.Should().BeTrue();
        claim.Status.Should().Be("Approved");
        _busMock.Verify(b => b.Publish(It.IsAny<ClaimApprovedEvent>(), default), Times.Once);
    }

    [Test]
    public async Task RejectClaimAsync_ShouldUpdateStatusAndPublishEvent()
    {
        // Arrange
        var claimId = 789;
        var claim = new AdminClaim { ClaimId = claimId, Status = "Under Review", PolicyId = Guid.NewGuid(), UserId = Guid.NewGuid() };
        _claimRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminClaim> { claim });

        // Act
        var result = await _service.RejectClaimAsync(claimId, "Fraudulent");

        // Assert
        result.Should().BeTrue();
        claim.Status.Should().Be("Rejected");
        _busMock.Verify(b => b.Publish(It.IsAny<ClaimRejectedEvent>(), default), Times.Once);
    }

    [Test]
    public async Task GetClaimByIdAsync_ShouldResolveName()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var claimId = 1;
        var claim = new AdminClaim { ClaimId = claimId, UserId = userId, CustomerName = "Unknown" };
        var user = new AdminUser { UserId = userId, FullName = "Resolved User" };
        
        _claimRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminClaim> { claim });
        _userRepoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<AdminUser> { user });

        // Act
        var result = await _service.GetClaimByIdAsync(claimId);

        // Assert
        result.Should().NotBeNull();
        result!.CustomerName.Should().Be("Resolved User");
    }
}
