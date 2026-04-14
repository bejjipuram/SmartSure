using MassTransit;
using Microsoft.Extensions.Logging;
using SmartSure.Admin.Application.Interfaces;
using SmartSure.Admin.Domain.Entities;
using SmartSure.Shared.Contracts.Events;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SmartSure.Admin.Application.Consumers;

public class PolicyCreatedConsumer : IConsumer<PolicyCreatedEvent>
{
    private readonly IAdminRepository<AdminPolicy> _policyRepo;
    private readonly IAdminRepository<AdminUser> _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<PolicyCreatedConsumer> _logger;

    public PolicyCreatedConsumer(
        IAdminRepository<AdminPolicy> policyRepo,
        IAdminRepository<AdminUser> userRepo,
        IUnitOfWork unitOfWork,
        ILogger<PolicyCreatedConsumer> logger)
    {
        _policyRepo = policyRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PolicyCreatedEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Received PolicyCreatedEvent for PolicyId: {PolicyId}, UserId: {UserId}", message.PolicyId, message.UserId);

        var existingPolicies = await _policyRepo.GetAllAsync();
        var localPolicy = existingPolicies.FirstOrDefault(p => p.PolicyId == message.PolicyId);

        var allUsers = await _userRepo.GetAllAsync();
        var adminUser = allUsers.FirstOrDefault(u => u.UserId == message.UserId);
        var resolvedName = adminUser?.FullName ?? message.CustomerName;

        if (localPolicy == null)
        {
            var adminPolicy = new AdminPolicy
            {
                PolicyId = message.PolicyId,
                UserId = message.UserId,
                PolicyNumber = message.PolicyNumber,
                CustomerName = resolvedName,
                InsuranceType = message.InsuranceType,
                PremiumAmount = message.PremiumAmount,
                InsuredDeclaredValue = message.InsuredDeclaredValue,
                Status = message.Status
            };

            await _policyRepo.AddAsync(adminPolicy);
            await _unitOfWork.SaveChangesAsync();
            _logger.LogInformation("Successfully mirrored PolicyId {PolicyId} for user {Name} into Admin DB.", message.PolicyId, resolvedName);
        }
        else
        {
            // Update existing policy
            localPolicy.UserId = message.UserId;
            localPolicy.CustomerName = resolvedName;
            localPolicy.InsuredDeclaredValue = message.InsuredDeclaredValue;
            localPolicy.PremiumAmount = message.PremiumAmount;
            localPolicy.Status = message.Status;
            
            await _policyRepo.UpdateAsync(localPolicy);
            await _unitOfWork.SaveChangesAsync();
            _logger.LogInformation("Updated mirrored PolicyId {PolicyId} in Admin DB.", message.PolicyId);
        }
    }
}
