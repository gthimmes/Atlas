using System.Text.Json;
using Atlas.Api.Infrastructure;
using Dapper;
using FluentMigrator.Runner;

namespace Atlas.Api.Infrastructure;

/// <summary>
/// Loads fixtures/ into a fresh database. Idempotent: truncates read-model
/// tables before inserting (event_log is preserved in Phase 1+ -- wiped
/// here for a clean slate). Run via `dotnet run --project apps/api -- seed`.
/// </summary>
public static class Seeder
{
    public static async Task RunAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();

        // Run migrations first.
        var runner = scope.ServiceProvider.GetRequiredService<IMigrationRunner>();
        runner.MigrateUp();

        var factory = scope.ServiceProvider.GetRequiredService<IAtlasConnectionFactory>();
        using var conn = factory.Open();
        using var tx = conn.BeginTransaction();

        // Wipe read-model tables in FK-safe order (event_log cleared too for seed clean-slate).
        foreach (var table in new[]
                 {
                     "task", "spec", "agent_identity", "atlas_user",
                     "project", "workspace", "event_log"
                 })
        {
            await conn.ExecuteAsync($"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;", transaction: tx);
        }

        var fixtureDir = LocateFixtures();
        var workspace = await JsonDocument.ParseAsync(File.OpenRead(Path.Combine(fixtureDir, "workspace.json")));
        var specsAndTasks = await JsonDocument.ParseAsync(File.OpenRead(Path.Combine(fixtureDir, "specs-and-tasks.json")));

        await InsertWorkspace(conn, tx, workspace.RootElement.GetProperty("workspace"));
        await InsertProject(conn, tx, workspace.RootElement.GetProperty("workspace"));

        foreach (var u in workspace.RootElement.GetProperty("users").EnumerateArray())
        {
            await InsertUser(conn, tx, u);
        }

        foreach (var a in workspace.RootElement.GetProperty("agents").EnumerateArray())
        {
            await InsertAgent(conn, tx, a);
        }

        foreach (var s in specsAndTasks.RootElement.GetProperty("specs").EnumerateArray())
        {
            await InsertSpec(conn, tx, s);
        }

        foreach (var t in specsAndTasks.RootElement.GetProperty("tasks").EnumerateArray())
        {
            await InsertTask(conn, tx, t);
        }

        tx.Commit();
        Console.WriteLine("Seed complete.");
    }

    private static string LocateFixtures()
    {
        // Walk up from the running binary until we find a /fixtures directory.
        var dir = AppContext.BaseDirectory;
        for (var depth = 0; depth < 8; depth++)
        {
            var candidate = Path.Combine(dir, "fixtures");
            if (Directory.Exists(candidate)) return candidate;
            var parent = Directory.GetParent(dir);
            if (parent is null) break;
            dir = parent.FullName;
        }
        throw new DirectoryNotFoundException("fixtures/ directory not found walking up from " + AppContext.BaseDirectory);
    }

    private static Task InsertWorkspace(System.Data.IDbConnection conn, System.Data.IDbTransaction tx, JsonElement w) => conn.ExecuteAsync(new CommandDefinition("""
        INSERT INTO workspace (id, name, slug, plan, acu_per_week, default_cool_down_weeks, default_bet_weeks, notification_model, spec_sync, adr_sync, created_at)
        VALUES (@id, @name, @slug, @plan, @acu_per_week, @default_cool_down_weeks, @default_bet_weeks, @notification_model, @spec_sync::jsonb, @adr_sync::jsonb, @created_at);
        """,
        new
        {
            id = w.GetProperty("id").GetString(),
            name = w.GetProperty("name").GetString(),
            slug = w.GetProperty("slug").GetString(),
            plan = w.GetProperty("plan").GetString(),
            acu_per_week = w.GetProperty("acu_per_week").GetInt32(),
            default_cool_down_weeks = w.GetProperty("default_cool_down_weeks").GetInt32(),
            default_bet_weeks = w.GetProperty("default_bet_weeks").GetInt32(),
            notification_model = w.GetProperty("notification_model").GetString(),
            spec_sync = w.GetProperty("spec_sync").GetRawText(),
            adr_sync = w.GetProperty("adr_sync").GetRawText(),
            created_at = DateTimeOffset.Parse(w.GetProperty("created_at").GetString()!),
        }, transaction: tx));

    private static Task InsertProject(System.Data.IDbConnection conn, System.Data.IDbTransaction tx, JsonElement w)
    {
        // The fixture workspace.json doesn't declare projects explicitly, but specs/tasks
        // reference "prj_core". Seed a stub project for the workspace so FKs resolve.
        return conn.ExecuteAsync(new CommandDefinition("""
            INSERT INTO project (id, workspace, slug, name) VALUES ('prj_core', @ws, 'core', 'Core');
            """, new { ws = w.GetProperty("id").GetString() }, transaction: tx));
    }

    private static Task InsertUser(System.Data.IDbConnection conn, System.Data.IDbTransaction tx, JsonElement u) => conn.ExecuteAsync(new CommandDefinition("""
        INSERT INTO atlas_user (id, workspace, email, name, role, created_at)
        VALUES (@id, @workspace, @email, @name, @role, @created_at);
        """, new
    {
        id = u.GetProperty("id").GetString(),
        workspace = u.GetProperty("workspace").GetString(),
        email = u.GetProperty("email").GetString(),
        name = u.GetProperty("name").GetString(),
        role = u.GetProperty("role").GetString(),
        created_at = DateTimeOffset.Parse(u.GetProperty("created_at").GetString()!),
    }, transaction: tx));

    private static Task InsertAgent(System.Data.IDbConnection conn, System.Data.IDbTransaction tx, JsonElement a) => conn.ExecuteAsync(new CommandDefinition("""
        INSERT INTO agent_identity (id, workspace, handle, model, oauth_issuer, owner, description, approved, trust_history, stats)
        VALUES (@id, @workspace, @handle, @model, @oauth_issuer, @owner, @description, @approved, @trust_history::jsonb, @stats::jsonb);
        """, new
    {
        id = a.GetProperty("id").GetString(),
        workspace = a.GetProperty("workspace").GetString(),
        handle = a.GetProperty("handle").GetString(),
        model = a.GetProperty("model").GetString(),
        oauth_issuer = a.GetProperty("oauth_issuer").GetString(),
        owner = a.GetProperty("owner").GetString(),
        description = a.GetProperty("description").GetString(),
        approved = a.GetProperty("approved").GetBoolean(),
        trust_history = a.GetProperty("trust_history").GetRawText(),
        stats = a.GetProperty("stats").GetRawText(),
    }, transaction: tx));

    private static Task InsertSpec(System.Data.IDbConnection conn, System.Data.IDbTransaction tx, JsonElement s) => conn.ExecuteAsync(new CommandDefinition("""
        INSERT INTO spec (
          id, workspace, project, pitch, parent_spec, title, slug, status, version, head_sha,
          intent, non_goals, constraints, acceptance, decisions, open_questions, context_bundle,
          readiness_score, readiness_breakdown, task_ids, actor_summary,
          repo_path, owner, created_at, created_by, updated_at, shipped_at
        ) VALUES (
          @id, @workspace, @project, @pitch, @parent_spec, @title, @slug, @status, @version, @head_sha,
          @intent, @non_goals::jsonb, @constraints::jsonb, @acceptance::jsonb, @decisions::jsonb, @open_questions::jsonb, @context_bundle,
          @readiness_score, @readiness_breakdown::jsonb, @task_ids::jsonb, @actor_summary::jsonb,
          @repo_path, @owner, @created_at, @created_by, @updated_at, @shipped_at
        );
        """, new
    {
        id = s.GetProperty("id").GetString(),
        workspace = s.GetProperty("workspace").GetString(),
        project = s.GetProperty("project").GetString(),
        pitch = s.TryGetProperty("pitch", out var p) && p.ValueKind != JsonValueKind.Null ? p.GetString() : null,
        parent_spec = s.TryGetProperty("parent_spec", out var ps) && ps.ValueKind != JsonValueKind.Null ? ps.GetString() : null,
        title = s.GetProperty("title").GetString(),
        slug = s.GetProperty("slug").GetString(),
        status = s.GetProperty("status").GetString(),
        version = s.GetProperty("version").GetInt32(),
        head_sha = s.GetProperty("head_sha").GetString(),
        intent = s.TryGetProperty("intent", out var iv) && iv.ValueKind != JsonValueKind.Null ? iv.GetString() : null,
        non_goals = s.GetProperty("non_goals").GetRawText(),
        constraints = s.GetProperty("constraints").GetRawText(),
        acceptance = s.GetProperty("acceptance").GetRawText(),
        decisions = s.GetProperty("decisions").GetRawText(),
        open_questions = s.GetProperty("open_questions").GetRawText(),
        context_bundle = s.TryGetProperty("context_bundle", out var cb) && cb.ValueKind != JsonValueKind.Null ? cb.GetString() : null,
        readiness_score = s.GetProperty("readiness_score").GetInt32(),
        readiness_breakdown = s.GetProperty("readiness_breakdown").GetRawText(),
        task_ids = s.GetProperty("task_ids").GetRawText(),
        actor_summary = s.GetProperty("actor_summary").GetRawText(),
        repo_path = s.TryGetProperty("repo_path", out var rp) && rp.ValueKind != JsonValueKind.Null ? rp.GetString() : null,
        owner = s.GetProperty("owner").GetString(),
        created_at = DateTimeOffset.Parse(s.GetProperty("created_at").GetString()!),
        created_by = s.GetProperty("created_by").GetString(),
        updated_at = DateTimeOffset.Parse(s.GetProperty("updated_at").GetString()!),
        shipped_at = s.TryGetProperty("shipped_at", out var sh) && sh.ValueKind != JsonValueKind.Null
                ? DateTimeOffset.Parse(sh.GetString()!) : (DateTimeOffset?)null,
    }, transaction: tx));

    private static Task InsertTask(System.Data.IDbConnection conn, System.Data.IDbTransaction tx, JsonElement t) => conn.ExecuteAsync(new CommandDefinition("""
        INSERT INTO task (
          id, workspace, parent_spec, parent_task, title, description, status,
          assignee, delegated_to, delegation_history, blocks, blocked_by,
          context_bundle_override, agent_budget, risk, paths,
          proposed_by, approved_by, created_at, updated_at, completed_at
        ) VALUES (
          @id, @workspace, @parent_spec, @parent_task, @title, @description, @status,
          @assignee, @delegated_to, @delegation_history::jsonb, @blocks::jsonb, @blocked_by::jsonb,
          @context_bundle_override, @agent_budget::jsonb, @risk, @paths::jsonb,
          @proposed_by, @approved_by, @created_at, @updated_at, @completed_at
        );
        """, new
    {
        id = t.GetProperty("id").GetString(),
        workspace = t.GetProperty("workspace").GetString(),
        parent_spec = t.GetProperty("parent_spec").GetString(),
        parent_task = t.TryGetProperty("parent_task", out var pt) && pt.ValueKind != JsonValueKind.Null ? pt.GetString() : null,
        title = t.GetProperty("title").GetString(),
        description = t.TryGetProperty("description", out var d) && d.ValueKind != JsonValueKind.Null ? d.GetString() : null,
        status = t.GetProperty("status").GetString(),
        assignee = t.GetProperty("assignee").GetString(),
        delegated_to = t.TryGetProperty("delegated_to", out var dt) && dt.ValueKind != JsonValueKind.Null ? dt.GetString() : null,
        delegation_history = t.GetProperty("delegation_history").GetRawText(),
        blocks = t.GetProperty("blocks").GetRawText(),
        blocked_by = t.GetProperty("blocked_by").GetRawText(),
        context_bundle_override = t.TryGetProperty("context_bundle_override", out var cbo) && cbo.ValueKind != JsonValueKind.Null ? cbo.GetString() : null,
        agent_budget = t.TryGetProperty("agent_budget", out var ab) && ab.ValueKind != JsonValueKind.Null ? ab.GetRawText() : null,
        risk = t.GetProperty("risk").GetString(),
        paths = t.GetProperty("paths").GetRawText(),
        proposed_by = t.GetProperty("proposed_by").GetString(),
        approved_by = t.TryGetProperty("approved_by", out var ap) && ap.ValueKind != JsonValueKind.Null ? ap.GetString() : null,
        created_at = DateTimeOffset.Parse(t.GetProperty("created_at").GetString()!),
        updated_at = DateTimeOffset.Parse(t.GetProperty("updated_at").GetString()!),
        completed_at = t.TryGetProperty("completed_at", out var co) && co.ValueKind != JsonValueKind.Null
                ? DateTimeOffset.Parse(co.GetString()!) : (DateTimeOffset?)null,
    }, transaction: tx));
}
