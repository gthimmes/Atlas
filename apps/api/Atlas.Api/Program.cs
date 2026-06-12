using Atlas.Api.Auth;
using Atlas.Api.Domain;
using Atlas.Api.Endpoints;
using Atlas.Api.Infrastructure;
using Atlas.Api.Mcp;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using ModelContextProtocol.Protocol;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console());

builder.Services.AddAtlasDatabase(builder.Configuration);
builder.Services.AddAtlasJson();
builder.Services.AddAtlasDomain();
builder.Services.AddValidatorsFromAssemblyContaining<ProposeSpecEditValidator>();
builder.Services.AddCors(o => o.AddPolicy("web", p => p
    .WithOrigins("http://localhost:5173")
    .AllowAnyMethod()
    .AllowAnyHeader()));

// Agent bearer tokens (atk_*) guard the MCP surface. The /v1 HTTP surface
// stays open for the web UI until the OAuth slice lands (decisions.md §2).
builder.Services.AddAuthentication(AgentTokenDefaults.Scheme)
    .AddScheme<AuthenticationSchemeOptions, AgentTokenAuthenticationHandler>(AgentTokenDefaults.Scheme, null);
builder.Services.AddAuthorization(o => o.AddPolicy(AgentTokenDefaults.Policy, p => p
    .AddAuthenticationSchemes(AgentTokenDefaults.Scheme)
    .RequireAuthenticatedUser()
    .RequireClaim("actor_kind", "agent")));

// MCP workspace:// endpoint (api-contract.md). Stateless streamable HTTP:
// every request authenticates independently, which matches the bearer-token
// model and keeps the server horizontally scalable. resources/subscribe
// lands with the session slice.
builder.Services.AddHttpContextAccessor();
builder.Services.AddMcpServer(o => o.ServerInfo = new Implementation
{
    Name = "atlas",
    Title = "Atlas Workspace",
    Version = "1.0.0",
})
    .WithHttpTransport(o => o.Stateless = true)
    .WithTools<AtlasMcpTools>()
    .WithResources<AtlasMcpResources>();

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthEndpoints();
app.MapMcp("/mcp").RequireAuthorization(AgentTokenDefaults.Policy);
app.MapSpecEndpoints();
app.MapTaskEndpoints();
app.MapTaskToolEndpoints();
app.MapWorkspaceToolEndpoints();

// Seed subcommand -- run with `dotnet run -- seed`. Kept sync so the
// top-level Main stays non-async (WebApplicationFactory's HostFactoryResolver
// can't intercept an async entry point cleanly).
if (args.Length > 0 && args[0] == "seed")
{
    Seeder.RunAsync(app.Services).GetAwaiter().GetResult();
    return;
}

app.Run();

// Exposed for WebApplicationFactory<Program>.
public partial class Program;
