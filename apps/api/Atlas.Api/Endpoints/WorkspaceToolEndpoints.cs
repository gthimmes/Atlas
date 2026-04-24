using System.Text.Json;
using Atlas.Api.EventSourcing;
using Atlas.Api.Infrastructure;
using Atlas.Api.Readiness;
using Atlas.Api.Sse;
using Dapper;
using FluentValidation;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Options;

namespace Atlas.Api.Endpoints;

public static class WorkspaceToolEndpoints
{
    public static IEndpointRouteBuilder MapWorkspaceToolEndpoints(this IEndpointRouteBuilder routes)
    {
        var tools = routes.MapGroup("/v1/tools").WithTags("tools");
        tools.MapPost("/spec.create", CreateSpec).WithName("SpecCreate");
        tools.MapPost("/project.create", CreateProject).WithName("ProjectCreate");
        tools.MapPost("/workspace.reset", ResetWorkspace).WithName("WorkspaceReset");

        var projects = routes.MapGroup("/v1/projects").WithTags("projects");
        projects.MapGet("/", ListProjects).WithName("ListProjects");

        var users = routes.MapGroup("/v1/users").WithTags("users");
        users.MapGet("/", ListUsers).WithName("ListUsers");

        return routes;
    }

    // ─── spec.create ──────────────────────────────────────────────────

    public sealed record SpecCreateRequest(
        string Title,
        string Project,
        string Owner,
        string? Slug = null,
        string? Intent = null);

    public sealed class SpecCreateValidator : AbstractValidator<SpecCreateRequest>
    {
        public SpecCreateValidator()
        {
            RuleFor(r => r.Title).NotEmpty().MaximumLength(200);
            RuleFor(r => r.Project).NotEmpty().Matches("^prj_[A-Za-z0-9_-]+$");
            RuleFor(r => r.Owner).NotEmpty().Matches("^usr_[A-Za-z0-9_-]+$");
            RuleFor(r => r.Slug!).Matches("^[a-z0-9-]+$").When(r => !string.IsNullOrEmpty(r.Slug));
        }
    }

    private static async Task<IResult> CreateSpec(
        SpecCreateRequest req,
        IValidator<SpecCreateRequest> validator,
        IAtlasConnectionFactory factory,
        IEventLog eventLog,
        SpecProjection projection,
        HttpContext http,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return BadRequest("E_SCHEMA_MISMATCH", string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

        using var conn = factory.Open();
        using var tx = conn.BeginTransaction();

        var project = await conn.QuerySingleOrDefaultAsync<(string id, string workspace)?>(new CommandDefinition(
            "SELECT id, workspace FROM project WHERE id = @id", new { id = req.Project },
            transaction: tx, cancellationToken: ct));
        if (project is null)
            return NotFound($"project {req.Project} not found");

        var owner = await conn.ExecuteScalarAsync<string?>(new CommandDefinition(
            "SELECT id FROM atlas_user WHERE id = @id", new { id = req.Owner },
            transaction: tx, cancellationToken: ct));
        if (owner is null)
            return NotFound($"user {req.Owner} not found");

        var slug = req.Slug ?? Slugify(req.Title);
        // Uniqueness: (workspace, slug) is UNIQUE; append -N until free.
        var finalSlug = slug;
        for (var i = 2; await conn.ExecuteScalarAsync<int>(new CommandDefinition(
                 "SELECT COUNT(*) FROM spec WHERE workspace = @ws AND slug = @slug",
                 new { ws = project.Value.workspace, slug = finalSlug },
                 transaction: tx, cancellationToken: ct)) > 0; i++)
            finalSlug = $"{slug}-{i}";

        var actor = http.User.Identity?.Name ?? owner;
        var actorKind = actor.StartsWith("agt_") ? "agent" : "human";
        var specId = $"spec_{Guid.NewGuid():N}"[..12];

        var created = new SpecCreated(
            Workspace: project.Value.workspace,
            Project: req.Project,
            Title: req.Title,
            Slug: finalSlug,
            Owner: req.Owner,
            Intent: req.Intent);

        var eventId = await eventLog.AppendAsync(conn, tx,
            aggregateType: "spec", aggregateId: specId,
            kind: SpecEventKinds.Created, payload: created,
            actor: actor, actorKind: actorKind, ct: ct);

        await projection.CreateAsync(conn, tx, specId, created, actor, ct);
        tx.Commit();

        return Results.Created($"/v1/specs/{specId}", new { id = specId, slug = finalSlug, event_id = eventId });
    }

    // ─── project.create ───────────────────────────────────────────────

    public sealed record ProjectCreateRequest(string Slug, string Name, string? Workspace = null);

    public sealed class ProjectCreateValidator : AbstractValidator<ProjectCreateRequest>
    {
        public ProjectCreateValidator()
        {
            RuleFor(r => r.Slug).NotEmpty().Matches("^[a-z0-9-]+$");
            RuleFor(r => r.Name).NotEmpty().MaximumLength(200);
        }
    }

    private static async Task<IResult> CreateProject(
        ProjectCreateRequest req,
        IValidator<ProjectCreateRequest> validator,
        IAtlasConnectionFactory factory,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return BadRequest("E_SCHEMA_MISMATCH", string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

        using var conn = factory.Open();
        // Default to the sole workspace if not specified.
        var ws = req.Workspace
            ?? await conn.ExecuteScalarAsync<string?>(new CommandDefinition(
                "SELECT id FROM workspace ORDER BY created_at LIMIT 1;",
                cancellationToken: ct));
        if (ws is null) return NotFound("no workspace exists");

        var projectId = $"prj_{Guid.NewGuid():N}"[..12];
        try
        {
            await conn.ExecuteAsync(new CommandDefinition("""
                INSERT INTO project (id, workspace, slug, name) VALUES (@id, @ws, @slug, @name);
                """, new { id = projectId, ws, slug = req.Slug, name = req.Name }, cancellationToken: ct));
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "23505")
        {
            return Results.Conflict(new { error = new { code = "E_CONFLICT", message = $"project slug '{req.Slug}' already exists in this workspace", retryable = false } });
        }

        return Results.Created($"/v1/projects/{projectId}", new { id = projectId });
    }

    // ─── workspace.reset (dev-only) ───────────────────────────────────

    private static async Task<IResult> ResetWorkspace(
        IAtlasConnectionFactory factory,
        CancellationToken ct)
    {
        using var conn = factory.Open();
        using var tx = conn.BeginTransaction();
        // Wipe work-in-flight state but preserve workspace + users + agents + projects.
        foreach (var t in new[] { "task", "spec", "event_log" })
            await conn.ExecuteAsync($"TRUNCATE TABLE {t} RESTART IDENTITY CASCADE;", transaction: tx);
        tx.Commit();
        return Results.Ok(new { reset = true });
    }

    // ─── project list + user list (for the modal dropdowns) ───────────

    private static async Task<IResult> ListProjects(IAtlasConnectionFactory factory, CancellationToken ct)
    {
        using var conn = factory.Open();
        var rows = await conn.QueryAsync(new CommandDefinition(
            """
            SELECT p.id, p.workspace, p.slug, p.name, p.created_at,
                   COUNT(s.id) AS spec_count
            FROM project p
            LEFT JOIN spec s ON s.project = p.id
            GROUP BY p.id
            ORDER BY p.name;
            """,
            cancellationToken: ct));
        return Results.Ok(new { items = rows.ToList(), next_cursor = (string?)null });
    }

    private static async Task<IResult> ListUsers(IAtlasConnectionFactory factory, CancellationToken ct)
    {
        using var conn = factory.Open();
        var rows = await conn.QueryAsync(new CommandDefinition(
            "SELECT id, workspace, email, name, role, created_at FROM atlas_user ORDER BY name;",
            cancellationToken: ct));
        return Results.Ok(new { items = rows.ToList(), next_cursor = (string?)null });
    }

    // ─── helpers ──────────────────────────────────────────────────────

    private static string Slugify(string title)
    {
        var lower = title.ToLowerInvariant();
        var chars = new List<char>(lower.Length);
        var lastWasHyphen = false;
        foreach (var ch in lower)
        {
            if (char.IsLetterOrDigit(ch))
            {
                chars.Add(ch);
                lastWasHyphen = false;
            }
            else if (!lastWasHyphen && chars.Count > 0)
            {
                chars.Add('-');
                lastWasHyphen = true;
            }
        }
        while (chars.Count > 0 && chars[^1] == '-') chars.RemoveAt(chars.Count - 1);
        var slug = new string(chars.ToArray());
        return string.IsNullOrEmpty(slug) ? "spec" : slug;
    }

    private static IResult BadRequest(string code, string message) =>
        Results.BadRequest(new { error = new { code, message, retryable = false } });

    private static IResult NotFound(string message) =>
        Results.NotFound(new { error = new { code = "E_NOT_FOUND", message, retryable = false } });
}
