using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;

namespace SmartSure.Shared.Infrastructure.Extensions;

public static class SerilogExtensions
{
    public static IHostBuilder AddSerilogLogging(this IHostBuilder host, string serviceName)
    {
        return host.UseSerilog((context, loggerConfiguration) =>
        {
            loggerConfiguration
                .MinimumLevel.Verbose()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .MinimumLevel.Override("Ocelot", LogEventLevel.Information)
                .Enrich.FromLogContext()
                .Enrich.WithProperty("Service", serviceName)
                .WriteTo.Console(outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] [{Service}] [{UserEmail}] {Message:lj}{NewLine}{Exception}")
                .WriteTo.File(
                    path: $"Logs/log-.txt",
                    rollingInterval: RollingInterval.Day,
                    outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] [{Service}] [{UserEmail}] {Message:lj}{NewLine}{Exception}"
                );
        });
    }
}
