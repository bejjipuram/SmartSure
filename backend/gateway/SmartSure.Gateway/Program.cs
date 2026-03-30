using DotNetEnv;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using SmartSure.Shared.Infrastructure.Extensions;

// Load .env file — walk up from the binary output dir until we find it
var envPath = AppContext.BaseDirectory;
while (!File.Exists(Path.Combine(envPath, ".env")) && Directory.GetParent(envPath) != null)
{
    envPath = Directory.GetParent(envPath)!.FullName;
}
Env.Load(Path.Combine(envPath, ".env"));

var builder = WebApplication.CreateBuilder(args);

// Logging
builder.Host.AddSerilogLogging("Gateway");

// Load Ocelot Configuration
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

// Add Ocelot + Swagger Aggregation
builder.Services.AddOcelot();

// CORS
var allowedOrigins = builder.Configuration
    .GetValue<string>("AllowedOrigins")?
    .Split(",") ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Middleware
app.UseRouting();
app.UseCors("AllowAngular");

// Test endpoint
app.MapGet("/", () => "SmartSure API Gateway is running!");

// Ocelot Middleware
await app.UseOcelot();

app.Run();