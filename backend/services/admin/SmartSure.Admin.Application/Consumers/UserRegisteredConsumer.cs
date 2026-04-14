using MassTransit;
using Microsoft.Extensions.Logging;
using SmartSure.Admin.Application.Interfaces;
using SmartSure.Admin.Domain.Entities;
using SmartSure.Shared.Contracts.Events;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace SmartSure.Admin.Application.Consumers;

public class UserRegisteredConsumer : IConsumer<UserRegisteredEvent>
{
    private readonly IAdminRepository<AdminUser> _userRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UserRegisteredConsumer> _logger;

    public UserRegisteredConsumer(
        IAdminRepository<AdminUser> userRepo,
        IUnitOfWork unitOfWork,
        ILogger<UserRegisteredConsumer> logger)
    {
        _userRepo = userRepo;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<UserRegisteredEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Received UserRegisteredEvent for UserId {UserId} - Email: {Email}", message.UserId, message.Email);

        var existingUsers = await _userRepo.GetAllAsync();
        
        // Search by UserId first
        var localUser = existingUsers.FirstOrDefault(u => u.UserId == message.UserId);

        // If not found by UserId, search by Email (handle re-registrations)
        if (localUser == null)
        {
            localUser = existingUsers.FirstOrDefault(u => u.Email.Equals(message.Email, StringComparison.OrdinalIgnoreCase));
        }

        if (localUser == null)
        {
            var adminUser = new AdminUser
            {
                UserId = message.UserId,
                FullName = message.FullName,
                Email = message.Email,
                Role = message.Role,
                IsActive = true,
                CreatedAt = message.CreatedAt
            };

            await _userRepo.AddAsync(adminUser);
            await _unitOfWork.SaveChangesAsync();
            _logger.LogInformation("Successfully mirrored new user {Email} in Admin DB.", message.Email);
        }
        else
        {
            // Update existing user if details changed or UserId changed (re-registration)
            if (localUser.UserId != message.UserId)
            {
                _logger.LogInformation("Updating UserId for existing user {Email} from {OldId} to {NewId}", 
                    message.Email, localUser.UserId, message.UserId);
                localUser.UserId = message.UserId;
            }

            localUser.FullName = message.FullName;
            localUser.Role = message.Role;
            
            await _userRepo.UpdateAsync(localUser);
            await _unitOfWork.SaveChangesAsync();
            _logger.LogInformation("Updated mirrored user {Email} in Admin DB.", message.Email);
        }
    }
}
