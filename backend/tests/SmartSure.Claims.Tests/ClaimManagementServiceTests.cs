using Moq;
using NUnit.Framework;
using FluentAssertions;
using SmartSure.Claims.Application.Services;
using SmartSure.Claims.Application.Interfaces;
using SmartSure.Claims.Application.DTOs;
using SmartSure.Claims.Domain.Entities;
using SmartSure.Shared.Common.Models;
using SmartSure.Shared.Contracts.Events;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace SmartSure.Claims.Tests;

[TestFixture]
public class ClaimManagementServiceTests
{
    private Mock<IClaimRepository> _claimRepoMock;
    private Mock<IClaimHistoryRepository> _historyRepoMock;
    private Mock<IPublishEndpoint> _publishMock;
    private Mock<IUnitOfWork> _uowMock;
    private Mock<ILogger<ClaimManagementService>> _loggerMock;
    private ClaimManagementService _service;

    [SetUp]
    public void SetUp()
    {
        _claimRepoMock = new Mock<IClaimRepository>();
        _historyRepoMock = new Mock<IClaimHistoryRepository>();
        _publishMock = new Mock<IPublishEndpoint>();
        _uowMock = new Mock<IUnitOfWork>();
        _loggerMock = new Mock<ILogger<ClaimManagementService>>();

        _service = new ClaimManagementService(
            _claimRepoMock.Object,
            _historyRepoMock.Object,
            _publishMock.Object,
            _uowMock.Object,
            _loggerMock.Object
        );
    }

    [Test]
    public async Task InitiateClaimAsync_ShouldFail_WhenAmountExceedsIDV()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var policyId = Guid.NewGuid();
        var dto = new CreateClaimDto(policyId, DateTime.UtcNow.AddDays(-1), "Accident", 600000);

        var validPolicy = new ValidPolicy
        {
            PolicyId = policyId,
            UserId = userId,
            InsuredDeclaredValue = 500000, // IDV is 5L
            Status = "Active"
        };

        _claimRepoMock.Setup(r => r.GetValidPolicyAsync(policyId)).ReturnsAsync(validPolicy);

        // Act
        var result = await _service.InitiateClaimAsync(userId, dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Contain("Claim amount cannot exceed the policy IDV");
    }

    [Test]
    public async Task InitiateClaimAsync_ShouldSucceed_WhenValid()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var policyId = Guid.NewGuid();
        var dto = new CreateClaimDto(policyId, DateTime.UtcNow.AddDays(-1), "Minor damage", 100000);

        var validPolicy = new ValidPolicy
        {
            PolicyId = policyId,
            UserId = userId,
            InsuredDeclaredValue = 500000,
            Status = "Active"
        };

        _claimRepoMock.Setup(r => r.GetValidPolicyAsync(policyId)).ReturnsAsync(validPolicy);

        // Act
        var result = await _service.InitiateClaimAsync(userId, dto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _claimRepoMock.Verify(r => r.AddClaimAsync(It.Is<Claim>(c => 
            c.ClaimAmount == dto.ClaimAmount && 
            c.UserId == userId
        )), Times.Once);
    }

    [Test]
    public async Task InitiateClaimAsync_ShouldFail_WhenAmountIsZero()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var policyId = Guid.NewGuid();
        var dto = new CreateClaimDto(policyId, DateTime.UtcNow.AddDays(-1), "Test", 0);
        
        var validPolicy = new ValidPolicy { PolicyId = policyId, UserId = userId, Status = "Active" };
        _claimRepoMock.Setup(r => r.GetValidPolicyAsync(policyId)).ReturnsAsync(validPolicy);

        // Act
        var result = await _service.InitiateClaimAsync(userId, dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("Claim amount must be greater than 0.");
    }

    [Test]
    public async Task InitiateClaimAsync_ShouldFail_WhenIncidentDateIsInFuture()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var policyId = Guid.NewGuid();
        var dto = new CreateClaimDto(policyId, DateTime.UtcNow.AddDays(1), "Future incident", 1000);

        var validPolicy = new ValidPolicy { PolicyId = policyId, UserId = userId, Status = "Active" };
        _claimRepoMock.Setup(r => r.GetValidPolicyAsync(policyId)).ReturnsAsync(validPolicy);

        // Act
        var result = await _service.InitiateClaimAsync(userId, dto);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("Incident date cannot be in the future.");
    }

    [Test]
    public async Task InitiateClaimAsync_ShouldFail_WhenPolicyNotFound()
    {
        // Arrange
        _claimRepoMock.Setup(r => r.GetValidPolicyAsync(It.IsAny<Guid>())).ReturnsAsync((ValidPolicy)null);

        // Act
        var result = await _service.InitiateClaimAsync(Guid.NewGuid(), new CreateClaimDto(Guid.NewGuid(), DateTime.UtcNow, "Test", 100));

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("Invalid Policy ID. The policy does not exist.");
    }

    [Test]
    public async Task GetClaimByIdAsync_ShouldReturnNull_WhenNotFound()
    {
        // Arrange
        _claimRepoMock.Setup(r => r.GetClaimByIdAsync(123)).ReturnsAsync((Claim)null);

        // Act
        var result = await _service.GetClaimByIdAsync(123);

        // Assert
        result.Should().BeNull();
    }

    [Test]
    public async Task GetClaimsAsync_ShouldReturnClaimsList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var claims = new List<Claim> { new Claim { ClaimNumber = "CLM1", UserId = userId } };
        _claimRepoMock.Setup(r => r.GetClaimsByUserIdAsync(userId, 1, 10, null)).ReturnsAsync(claims);
        _claimRepoMock.Setup(r => r.GetClaimsCountAsync(userId, null)).ReturnsAsync(1);

        // Act
        var result = await _service.GetClaimsAsync(userId, 1, 10, null);

        // Assert
        result.Items.Should().HaveCount(1);
    }

    [Test]
    public async Task ReplayClaimSubmittedEventsAsync_ShouldPublishEventsForAllClaims()
    {
        // Arrange
        var claims = new List<Claim>
        {
            new Claim { Id = 1, ClaimNumber = "CLM1", UserId = Guid.NewGuid() },
            new Claim { Id = 2, ClaimNumber = "CLM2", UserId = Guid.NewGuid() }
        };
        _claimRepoMock.Setup(r => r.GetAllClaimsAsync()).ReturnsAsync(claims);

        // Act
        var result = await _service.ReplayClaimSubmittedEventsAsync();

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().Be(2);
        _publishMock.Verify(p => p.Publish(It.IsAny<ClaimSubmittedEvent>(), default), Times.Exactly(2));
    }

    [Test]
    public async Task ProcessClaimAsync_ShouldUpdateStatusAndAddHistory()
    {
        // Arrange
        var claimId = 1;
        var claim = new Claim { Id = claimId, Status = "Submitted" };
        _claimRepoMock.Setup(r => r.GetClaimByIdAsync(claimId)).ReturnsAsync(claim);

        // Act
        await _service.ProcessClaimAsync(claimId, Guid.NewGuid(), true, "Good proofs");

        // Assert
        claim.Status.Should().Be("Approved");
        _historyRepoMock.Verify(r => r.AddHistoryTokenAsync(It.Is<ClaimHistory>(h => 
            h.NewStatus == "Approved" && h.Remarks == "Good proofs"
        )), Times.Once);
        _uowMock.Verify(u => u.SaveChangesAsync(), Times.AtLeastOnce);
    }
}
