using MassTransit;
using Microsoft.Extensions.Logging;
using SmartSure.Admin.Application.Interfaces;
using SmartSure.Admin.Domain.Entities;
using SmartSure.Shared.Contracts.Events;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SmartSure.Admin.Application.Consumers;

public class ClaimSubmittedConsumer : IConsumer<ClaimSubmittedEvent>
{
    private readonly IAdminRepository<AdminClaim> _claimRepo;
    private readonly IAdminRepository<AdminUser> _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<ClaimSubmittedConsumer> _logger;

    public ClaimSubmittedConsumer(
        IAdminRepository<AdminClaim> claimRepo,
        IAdminRepository<AdminUser> userRepo,
        IUnitOfWork unitOfWork,
        ILogger<ClaimSubmittedConsumer> logger)
    {
        _claimRepo = claimRepo;
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ClaimSubmittedEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Received ClaimSubmittedEvent for ClaimId: {ClaimId}, UserId: {UserId}", message.ClaimId, message.UserId);

        var existingClaims = await _claimRepo.GetAllAsync();
        var localClaim = existingClaims.FirstOrDefault(c => c.ClaimId == message.ClaimId);

        if (localClaim == null)
        {
            var allUsers = await _userRepo.GetAllAsync();
            var adminUser = allUsers.FirstOrDefault(u => u.UserId == message.UserId);
            var resolvedName = adminUser?.FullName ?? message.CustomerName;
            if (string.IsNullOrEmpty(resolvedName)) resolvedName = "Unknown";

            var adminClaim = new AdminClaim
            {
                ClaimId = message.ClaimId,
                UserId = message.UserId,
                PolicyId = message.PolicyId,
                CustomerName = resolvedName,
                PolicyNumber = message.PolicyNumber,
                ClaimNumber = message.ClaimNumber,
                ClaimAmount = message.ClaimAmount,
                Status = message.NewStatus,
                Description = message.Description,
                IncidentDate = message.IncidentDate,
                CreatedAt = DateTime.UtcNow
            };

            await _claimRepo.AddAsync(adminClaim);
            await _unitOfWork.SaveChangesAsync();
            _logger.LogInformation("Successfully mirrored ClaimId {ClaimId} for user {Name} into Admin DB.", message.ClaimId, resolvedName);
        }
        else
        {
            _logger.LogWarning("ClaimId {ClaimId} already exists in Admin DB. Skipping creation.", message.ClaimId);
        }
    }
}
