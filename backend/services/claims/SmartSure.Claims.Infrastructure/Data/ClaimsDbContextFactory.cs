using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace SmartSure.Claims.Infrastructure.Data
{
    public class ClaimsDbContextFactory : IDesignTimeDbContextFactory<ClaimsDbContext>
    {
        public ClaimsDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<ClaimsDbContext>();

            // Always load appsettings.json from the API project directory
            var apiProjectPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "SmartSure.Claims.API");
            var config = new ConfigurationBuilder()
                .SetBasePath(apiProjectPath)
                .AddJsonFile("appsettings.json", optional: false)
                .Build();

            var connectionString = config.GetConnectionString("ClaimsDb");
            optionsBuilder.UseSqlServer(connectionString);

            return new ClaimsDbContext(optionsBuilder.Options);
        }
    }
}
