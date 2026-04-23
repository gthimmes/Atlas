using Atlas.Api.Endpoints;
using Atlas.Api.Infrastructure;
using FluentValidation;
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

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseCors("web");
app.MapHealthEndpoints();
app.MapSpecEndpoints();
app.MapTaskEndpoints();
app.MapTaskToolEndpoints();

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
