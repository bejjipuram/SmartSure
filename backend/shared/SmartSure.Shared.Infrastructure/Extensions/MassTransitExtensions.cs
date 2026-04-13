using System;
using System.Reflection;
using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace SmartSure.Shared.Infrastructure.Extensions;

public static class MassTransitExtensions
{
    public static IServiceCollection AddMassTransitWithRabbitMq(
        this IServiceCollection services, 
        IConfiguration configuration,
        string? prefix = null,
        Action<IBusRegistrationConfigurator>? configure = null)
    {
        services.AddMassTransit(x =>
        {
            if (string.IsNullOrEmpty(prefix))
            {
                x.SetKebabCaseEndpointNameFormatter();
            }
            else
            {
                x.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter(prefix, false));
            }

            configure?.Invoke(x);

            x.UsingRabbitMq((context, cfg) =>
            {
                var rabbitMqHost = configuration["RabbitMQ:Host"] ?? "localhost";
                var rabbitMqPort = int.TryParse(configuration["RabbitMQ:Port"], out var port) ? port : 5672;
                var rabbitMqUser = configuration["RabbitMQ:Username"] ?? "smartsure";
                var rabbitMqPass = configuration["RabbitMQ:Password"] ?? "smartsure";

                cfg.Host(rabbitMqHost, (ushort)rabbitMqPort, "/", h =>
                {
                    h.Username(rabbitMqUser);
                    h.Password(rabbitMqPass);
                });

                cfg.ConfigureEndpoints(context);
            });
        });

        return services;
    }
}
