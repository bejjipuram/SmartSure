using Microsoft.EntityFrameworkCore;
using SmartSure.Identity.Domain.Entities;
using SmartSure.Identity.Infrastructure.Data;

namespace SmartSure.Identity.Infrastructure.Seed;

public static class IdentityDbSeeder
{
    public static async Task SeedAsync(IdentityDbContext context)
    {
        // Apply any pending migrations (safe if DB already up-to-date)
        var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
        if (pendingMigrations.Any())
        {
            await context.Database.MigrateAsync();
        }
        else
        {
            // Ensure the database exists if no migrations have run yet
            await context.Database.EnsureCreatedAsync();
        }

        if (!await context.Roles.AnyAsync())
        {
            context.Roles.AddRange(
                new Role { Name = "Admin" },
                new Role { Name = "Policyholder" }
            );
            await context.SaveChangesAsync();
        }

        // Seed a default admin user
        if (!await context.Users.AnyAsync(u => u.Email == "admin@smartsure.com"))
        {
            var adminRole = await context.Roles.FirstAsync(r => r.Name == "Admin");
            var admin = new User
            {
                UserId = Guid.NewGuid(),
                Email = "admin@smartsure.com",
                FullName = "System Administrator",
                IsEmailVerified = true,
                IsActive = true
            };
            admin.Passwords.Add(new Password
            {
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123")
            });
            admin.UserRoles.Add(new UserRole { RoleId = adminRole.RoleId });

            context.Users.Add(admin);
            await context.SaveChangesAsync();
        }
    }
}
