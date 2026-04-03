using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Serilog.Context;
using System.Text.Json;
using System.Text;

public class SerilogUserEnricherMiddleware
{
    private readonly RequestDelegate _next;

    public SerilogUserEnricherMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        string? email = null;

        // ✅ 1. Get from JWT (BEST WAY)
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            email = context.User.FindFirst(ClaimTypes.Email)?.Value
                ?? context.User.FindFirst("email")?.Value;
        }
        // ✅ 2. Fallback: Get from request body
        else if (context.Request.Method == "POST")
        {
            context.Request.EnableBuffering();

            using var reader = new StreamReader(
                context.Request.Body,
                Encoding.UTF8,
                leaveOpen: true
            );

            var body = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;

            if (!string.IsNullOrWhiteSpace(body))
            {
                try
                {
                    using var json = JsonDocument.Parse(body);

                    if (json.RootElement.TryGetProperty("email", out var emailProp))
                    {
                        email = emailProp.GetString();
                    }
                }
                catch
                {
                    // ignore invalid JSON
                }
            }
        }

        using (LogContext.PushProperty("UserEmail", email ?? "anonymous"))
        {
            await _next(context);
        }
    }
}