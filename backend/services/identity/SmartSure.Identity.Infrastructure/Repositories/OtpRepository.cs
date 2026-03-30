using Microsoft.EntityFrameworkCore;
using SmartSure.Identity.Application.Interfaces;
using SmartSure.Identity.Domain.Entities;
using SmartSure.Identity.Infrastructure.Data;

namespace SmartSure.Identity.Infrastructure.Repositories;

public class OtpRepository : IOtpRepository
{
    private readonly IdentityDbContext _context;

    public OtpRepository(IdentityDbContext context)
    {
        _context = context;
    }

    public async Task<OtpRecord?> GetByEmailAsync(string email)
    {
        return await _context.OtpRecords.FirstOrDefaultAsync(o => o.Email == email);
    }

    public async Task AddAsync(OtpRecord record)
    {
        await _context.OtpRecords.AddAsync(record);
    }

    public Task UpdateAsync(OtpRecord record)
    {
        _context.OtpRecords.Update(record);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(OtpRecord record)
    {
        _context.OtpRecords.Remove(record);
        return Task.CompletedTask;
    }
}
