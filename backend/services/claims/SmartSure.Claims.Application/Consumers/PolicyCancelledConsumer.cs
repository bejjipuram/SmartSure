using MassTransit;
using Microsoft.Extensions.Logging;
using SmartSure.Claims.Application.Interfaces;
using SmartSure.Shared.Contracts.Events;
using System.Threading.Tasks;

namespace SmartSure.Claims.Application.Consumers;

public class PolicyCancelledConsumer : IConsumer<PolicyCancelledEvent>
{
    private readonly IClaimRepository _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<PolicyCancelledConsumer> _logger;

    public PolicyCancelledConsumer(
        IClaimRepository repository,
        IUnitOfWork unitOfWork,
        ILogger<PolicyCancelledConsumer> logger)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PolicyCancelledEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Claim Service: Received PolicyCancelledEvent for {PolicyId}", message.PolicyId);

        try
        {
            var policy = await _repository.GetValidPolicyAsync(message.PolicyId);
            if (policy != null)
            {
                policy.Status = "Cancelled";
                policy.UpdatedAt = DateTime.UtcNow;
                await _repository.UpdateValidPolicyAsync(policy);
                await _unitOfWork.SaveChangesAsync();
                _logger.LogInformation("Claim Service: Marked ValidPolicy {PolicyId} as Cancelled", message.PolicyId);
            }
            else
            {
                _logger.LogWarning(
                    "Claim Service: Received PolicyCancelledEvent for {PolicyId}, but no ValidPolicy mirror exists",
                    message.PolicyId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claim Service: Failed to process PolicyCancelledEvent for {PolicyId}", message.PolicyId);
            throw;
        }
    }
}
