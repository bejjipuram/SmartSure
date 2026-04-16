using Moq;
using NUnit.Framework;
using FluentAssertions;
using SmartSure.Policy.Application.Services;
using SmartSure.Policy.Application.Interfaces;
using SmartSure.Policy.Application.DTOs;
using SmartSure.Policy.Domain.Entities;
using SmartSure.Shared.Common.Models;
using SmartSure.Shared.Contracts.Events;
using MassTransit;

namespace SmartSure.Policy.Tests;

[TestFixture]
public class PolicyManagementServiceTests
{
    private Mock<IPolicyRepository> _policyRepoMock;
    private Mock<IInsuranceCatalogRepository> _catalogRepoMock;
    private Mock<IUnitOfWork> _uowMock;
    private Mock<IPublishEndpoint> _publishMock;
    private PolicyManagementService _service;

    [SetUp]
    public void SetUp()
    {
        _policyRepoMock = new Mock<IPolicyRepository>();
        _catalogRepoMock = new Mock<IInsuranceCatalogRepository>();
        _uowMock = new Mock<IUnitOfWork>();
        _publishMock = new Mock<IPublishEndpoint>();

        _service = new PolicyManagementService(
            _policyRepoMock.Object,
            _catalogRepoMock.Object,
            _uowMock.Object,
            _publishMock.Object
        );
    }

    [Test]
    public async Task BuyPolicyAsync_ShouldCalculateCorrectPremium_ForNewVehicle()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var subTypeId = 1;
        var vehicleDetails = new CreateVehicleDetailsDto("Tesla", "Model 3", DateTime.UtcNow.Year, 5000000, "VIN123", "MH01AB1234", 10000);
        var dto = new BuyPolicyDto(subTypeId, null, vehicleDetails);

        var subType = new InsuranceSubType { Id = subTypeId, Name = "Comprehensive", IsActive = true };
        _catalogRepoMock.Setup(r => r.GetSubTypeByIdAsync(subTypeId)).ReturnsAsync(subType);

        // Act
        var result = await _service.BuyPolicyAsync(userId, dto);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _policyRepoMock.Verify(r => r.AddPolicyAsync(It.Is<Domain.Entities.Policy>(p => 
            p.InsuredDeclaredValue == 4750000 && // 50L - 5% depreciation
            p.PremiumAmount == 95000 // 2% of IDV
        )), Times.Once);
    }

    [Test]
    public async Task BuyPolicyAsync_ShouldApplySurcharge_ForHighMileageVehicle()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var subTypeId = 1;
        var vehicleDetails = new CreateVehicleDetailsDto("Maruti", "Swift", DateTime.UtcNow.Year, 1000000, "VIN456", "MH01CD5678", 20000);
        var dto = new BuyPolicyDto(subTypeId, null, vehicleDetails);

        var subType = new InsuranceSubType { Id = subTypeId, Name = "Comprehensive", IsActive = true };
        _catalogRepoMock.Setup(r => r.GetSubTypeByIdAsync(subTypeId)).ReturnsAsync(subType);

        // Act
        var result = await _service.BuyPolicyAsync(userId, dto);

        // Assert
        // IDV = 10L - 5% = 9.5L
        // Basic Premium = 950000 * 0.02 = 19000
        // Surcharge = 19000 * 1.2 = 22800
        _policyRepoMock.Verify(r => r.AddPolicyAsync(It.Is<Domain.Entities.Policy>(p => 
            p.PremiumAmount == 22800
        )), Times.Once);
    }

    [Test]
    public async Task BuyPolicyAsync_ShouldCalculateCorrectPremium_ForHomeWithSecurity()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var subTypeId = 2;
        var homeDetails = new CreateHomeDetailsDto("123 Street", 10000000, DateTime.UtcNow.Year, "Concrete", true, true);
        var dto = new BuyPolicyDto(subTypeId, homeDetails, null);

        var subType = new InsuranceSubType { Id = subTypeId, Name = "Home Guard", IsActive = true };
        _catalogRepoMock.Setup(r => r.GetSubTypeByIdAsync(subTypeId)).ReturnsAsync(subType);

        // Act
        var result = await _service.BuyPolicyAsync(userId, dto);

        // Assert
        // IDV = 1Cr * 0.8 (reconstruction) * 0.9 (age depreciation) = 72,00,000
        // Basic Premium = 7200000 * 0.001 = 7200
        // Discounted Premium = 7200 * 0.9 = 6480
        _policyRepoMock.Verify(r => r.AddPolicyAsync(It.Is<Domain.Entities.Policy>(p => 
            p.PremiumAmount == 6480
        )), Times.Once);
    }

    [Test]
    public async Task BuyPolicyAsync_ShouldApplyDepreciation_For2YearOldVehicle()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var subTypeId = 1;
        var vehicleDetails = new CreateVehicleDetailsDto("Tesla", "Model 3", DateTime.UtcNow.Year - 2, 5000000, "VIN123", "MH01AB1234", 10000);
        var dto = new BuyPolicyDto(subTypeId, null, vehicleDetails);

        var subType = new InsuranceSubType { Id = subTypeId, Name = "Comprehensive", IsActive = true };
        _catalogRepoMock.Setup(r => r.GetSubTypeByIdAsync(subTypeId)).ReturnsAsync(subType);

        // Act
        var result = await _service.BuyPolicyAsync(userId, dto);

        // Assert
        // IDV = 50L - 20% depreciation (since vehicleAge is 2, falls into < 3 tier) = 40,00,000
        _policyRepoMock.Verify(r => r.AddPolicyAsync(It.Is<Domain.Entities.Policy>(p => 
            p.InsuredDeclaredValue == 4000000
        )), Times.Once);
    }

    [Test]
    public async Task BuyPolicyAsync_ShouldApplyDepreciation_For5YearOldVehicle()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var subTypeId = 1;
        var vehicleAge = 5;
        var vehicleDetails = new CreateVehicleDetailsDto("Tesla", "Model 3", DateTime.UtcNow.Year - vehicleAge, 5000000, "VIN123", "MH01AB1234", 10000);
        var dto = new BuyPolicyDto(subTypeId, null, vehicleDetails);

        var subType = new InsuranceSubType { Id = subTypeId, Name = "Comprehensive", IsActive = true };
        _catalogRepoMock.Setup(r => r.GetSubTypeByIdAsync(subTypeId)).ReturnsAsync(subType);

        // Act
        var result = await _service.BuyPolicyAsync(userId, dto);

        // Assert
        // IDV = 50L - 50% depreciation = 25,00,000
        _policyRepoMock.Verify(r => r.AddPolicyAsync(It.Is<Domain.Entities.Policy>(p => 
            p.InsuredDeclaredValue == 2500000
        )), Times.Once);
    }

    [Test]
    public async Task BuyPolicyAsync_ShouldApplyDepreciation_For10YearOldHome()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var subTypeId = 2;
        var homeDetails = new CreateHomeDetailsDto("123 Street", 10000000, DateTime.UtcNow.Year - 10, "Concrete", false, false);
        var dto = new BuyPolicyDto(subTypeId, homeDetails, null);

        var subType = new InsuranceSubType { Id = subTypeId, Name = "Home Guard", IsActive = true };
        _catalogRepoMock.Setup(r => r.GetSubTypeByIdAsync(subTypeId)).ReturnsAsync(subType);

        // Act
        var result = await _service.BuyPolicyAsync(userId, dto);

        // Assert
        // Reconstruction = 1Cr * 0.8 = 80,00,000
        // IDV = 80,00,000 - 30% depreciation (for 10 yrs, falls into < 20 tier) = 56,00,000
        _policyRepoMock.Verify(r => r.AddPolicyAsync(It.Is<Domain.Entities.Policy>(p => 
            p.InsuredDeclaredValue == 5600000
        )), Times.Once);
    }

    [Test]
    public async Task BuyPolicyAsync_ShouldApplyDepreciation_For30YearOldHome()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var subTypeId = 2;
        var homeDetails = new CreateHomeDetailsDto("Old Villa", 10000000, DateTime.UtcNow.Year - 30, "Wood", false, false);
        var dto = new BuyPolicyDto(subTypeId, homeDetails, null);

        var subType = new InsuranceSubType { Id = subTypeId, Name = "Home Guard", IsActive = true };
        _catalogRepoMock.Setup(r => r.GetSubTypeByIdAsync(subTypeId)).ReturnsAsync(subType);

        // Act
        var result = await _service.BuyPolicyAsync(userId, dto);

        // Assert
        // IDV = 80,00,000 - 50% depreciation (default tier) = 40,00,000
        _policyRepoMock.Verify(r => r.AddPolicyAsync(It.Is<Domain.Entities.Policy>(p => 
            p.InsuredDeclaredValue == 4000000
        )), Times.Once);
    }

    [Test]
    public async Task CalculatePremiumAsync_ShouldReturnStoredPremium()
    {
        // Arrange
        var policyId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var policy = new Domain.Entities.Policy { Id = policyId, UserId = userId, PremiumAmount = 5000 };
        _policyRepoMock.Setup(r => r.GetPolicyByIdAndUserIdAsync(policyId, userId)).ReturnsAsync(policy);

        // Act
        var result = await _service.CalculatePremiumAsync(policyId, userId);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().Be(5000);
    }

    [Test]
    public async Task CancelPolicyAsync_ShouldSucceed_WhenActive()
    {
        // Arrange
        var policyId = Guid.NewGuid();
        var policy = new Domain.Entities.Policy { Id = policyId, Status = "Active", UserId = Guid.NewGuid() };
        _policyRepoMock.Setup(r => r.GetPolicyByIdAsync(policyId)).ReturnsAsync(policy);

        // Act
        var result = await _service.CancelPolicyAsync(policyId);

        // Assert
        result.IsSuccess.Should().BeTrue();
        policy.Status.Should().Be("Cancelled");
        _publishMock.Verify(p => p.Publish(It.IsAny<PolicyCancelledEvent>(), default), Times.Once);
    }

    [Test]
    public async Task CancelPolicyAsync_ShouldFail_WhenAlreadyCancelled()
    {
        // Arrange
        var policyId = Guid.NewGuid();
        var policy = new Domain.Entities.Policy { Id = policyId, Status = "Cancelled" };
        _policyRepoMock.Setup(r => r.GetPolicyByIdAsync(policyId)).ReturnsAsync(policy);

        // Act
        var result = await _service.CancelPolicyAsync(policyId);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorMessage.Should().Be("Policy is already cancelled.");
    }

    [Test]
    public async Task ReplayPolicyCreatedEventsAsync_ShouldPublishEvents()
    {
        // Arrange
        var policies = new List<Domain.Entities.Policy>
        {
            new Domain.Entities.Policy { Id = Guid.NewGuid(), PolicyNumber = "POL1", UserId = Guid.NewGuid() },
            new Domain.Entities.Policy { Id = Guid.NewGuid(), PolicyNumber = "POL2", UserId = Guid.NewGuid() }
        };
        _policyRepoMock.Setup(r => r.GetPoliciesForReplayAsync("Active")).ReturnsAsync(policies);

        // Act
        var result = await _service.ReplayPolicyCreatedEventsAsync("Active");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().Be(2);
        _publishMock.Verify(p => p.Publish(It.IsAny<PolicyCreatedEvent>(), default), Times.Exactly(2));
    }
}
