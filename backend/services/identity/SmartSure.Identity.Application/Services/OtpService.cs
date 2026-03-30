using BCrypt.Net;
using SmartSure.Identity.Application.Interfaces;
using SmartSure.Identity.Domain.Entities;
using SmartSure.Shared.Common.Models;

namespace SmartSure.Identity.Application.Services;

public class OtpService : IOtpService
{
    private readonly IOtpRepository _otpRepository;
    private readonly IUnitOfWork _unitOfWork;

    public OtpService(IOtpRepository otpRepository, IUnitOfWork unitOfWork)
    {
        _otpRepository = otpRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<string>> GenerateOtpAsync(string email)
    {
        var existing = await _otpRepository.GetByEmailAsync(email);
        if (existing != null)
        {
            await _otpRepository.DeleteAsync(existing);
        }

        // Generate 6-digit OTP
        var random = new Random();
        var otpCode = random.Next(100000, 999999).ToString();
        var hashed = BCrypt.Net.BCrypt.HashPassword(otpCode);

        var record = new OtpRecord
        {
            Email = email,
            HashedOtp = hashed,
            Expiry = DateTime.UtcNow.AddMinutes(10),
            Attempts = 0
        };

        await _otpRepository.AddAsync(record);
        await _unitOfWork.SaveChangesAsync();

        return Result<string>.Success(otpCode);
    }

    public async Task<Result> ValidateOtpAsync(string email, string otpCode)
    {
        var record = await _otpRepository.GetByEmailAsync(email);
        if (record == null)
            return Result.Failure("OTP not found or expired.");

        if (record.Expiry < DateTime.UtcNow)
        {
            await _otpRepository.DeleteAsync(record);
            await _unitOfWork.SaveChangesAsync();
            return Result.Failure("OTP expired.");
        }

        if (record.Attempts >= 3)
        {
            await _otpRepository.DeleteAsync(record);
            await _unitOfWork.SaveChangesAsync();
            return Result.Failure("Too many failed attempts. OTP invalidated.");
        }

        if (!BCrypt.Net.BCrypt.Verify(otpCode, record.HashedOtp))
        {
            record.Attempts++;
            await _otpRepository.UpdateAsync(record);
            await _unitOfWork.SaveChangesAsync();
            return Result.Failure("Invalid OTP.");
        }

        await _otpRepository.DeleteAsync(record);
        await _unitOfWork.SaveChangesAsync();
        return Result.Success();
    }
}
