using System.Data;
using System.Text.Json;
using Atlas.Api.Readiness;
using Dapper;

namespace Atlas.Api.EventSourcing;

/// <summary>
/// Applies a spec-aggregate event to the `spec` read-model row and
/// recomputes readiness. Runs in the same transaction as the event_log
/// write so readers never see a spec row without its event.
/// </summary>
public sealed class SpecProjection(JsonSerializerOptions jsonOptions, IReadinessCalculator readiness)
{
    public async Task CreateAsync(IDbConnection conn, IDbTransaction tx, string specId, SpecCreated p, string actor, CancellationToken ct)
    {
        var initialBreakdown = readiness.Compute(new ReadinessInputs(
            NonGoals: [], Constraints: [], Acceptance: [], OpenQuestions: [], ContextBundleId: null));

        await conn.ExecuteAsync(new CommandDefinition("""
            INSERT INTO spec (
              id, workspace, project, title, slug, status, version, head_sha,
              intent, non_goals, constraints, acceptance, decisions, open_questions, context_bundle,
              readiness_score, readiness_breakdown, task_ids, actor_summary,
              repo_path, owner, created_by, created_at, updated_at
            ) VALUES (
              @id, @workspace, @project, @title, @slug, 'draft', 1, '0000000000000000000000000000000000000000',
              @intent, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL,
              @score, @breakdown::jsonb, '[]'::jsonb, '{"humans":[],"agents":[]}'::jsonb,
              NULL, @owner, @createdBy, now(), now()
            );
            """, new
        {
            id = specId,
            workspace = p.Workspace,
            project = p.Project,
            title = p.Title,
            slug = p.Slug,
            intent = p.Intent,
            owner = p.Owner,
            createdBy = actor,
            score = initialBreakdown.Score,
            breakdown = JsonSerializer.Serialize(initialBreakdown, jsonOptions),
        }, transaction: tx, cancellationToken: ct));
    }

    public async Task ApplyAsync(
        IDbConnection conn,
        IDbTransaction tx,
        string specId,
        string kind,
        object payload,
        string actor,
        CancellationToken ct)
    {
        // Bump version + updated_at on every mutation.
        await conn.ExecuteAsync(new CommandDefinition("""
            UPDATE spec SET version = version + 1, updated_at = now() WHERE id = @id;
            """, new { id = specId }, transaction: tx, cancellationToken: ct));

        switch (kind)
        {
            case SpecEventKinds.IntentEdited:
                {
                    var p = (SpecIntentEdited)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE spec SET intent = @intent WHERE id = @id;",
                        new { id = specId, intent = p.Intent }, transaction: tx, cancellationToken: ct));
                    break;
                }
            case SpecEventKinds.NonGoalsEdited:
                {
                    var p = (SpecNonGoalsEdited)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE spec SET non_goals = @v::jsonb WHERE id = @id;",
                        new { id = specId, v = JsonSerializer.Serialize(p.NonGoals, jsonOptions) },
                        transaction: tx, cancellationToken: ct));
                    break;
                }
            case SpecEventKinds.ConstraintsEdited:
                {
                    var p = (SpecConstraintsEdited)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE spec SET constraints = @v::jsonb WHERE id = @id;",
                        new { id = specId, v = p.Constraints.GetRawText() },
                        transaction: tx, cancellationToken: ct));
                    break;
                }
            case SpecEventKinds.AcceptanceEdited:
                {
                    var p = (SpecAcceptanceEdited)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE spec SET acceptance = @v::jsonb WHERE id = @id;",
                        new { id = specId, v = p.Acceptance.GetRawText() },
                        transaction: tx, cancellationToken: ct));
                    break;
                }
            case SpecEventKinds.DecisionsEdited:
                {
                    var p = (SpecDecisionsEdited)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE spec SET decisions = @v::jsonb WHERE id = @id;",
                        new { id = specId, v = JsonSerializer.Serialize(p.Decisions, jsonOptions) },
                        transaction: tx, cancellationToken: ct));
                    break;
                }
            case SpecEventKinds.OpenQuestionsEdited:
                {
                    var p = (SpecOpenQuestionsEdited)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE spec SET open_questions = @v::jsonb WHERE id = @id;",
                        new { id = specId, v = p.OpenQuestions.GetRawText() },
                        transaction: tx, cancellationToken: ct));
                    break;
                }
            case SpecEventKinds.ContextBundleEdited:
                {
                    var p = (SpecContextBundleEdited)payload;
                    await conn.ExecuteAsync(new CommandDefinition(
                        "UPDATE spec SET context_bundle = @v WHERE id = @id;",
                        new { id = specId, v = p.ContextBundle },
                        transaction: tx, cancellationToken: ct));
                    break;
                }
            case SpecEventKinds.AcceptanceStatusChanged:
                // Acceptance status lives inside the acceptance JSONB array; rewrite via jsonb_set.
                {
                    var p = (SpecAcceptanceStatusChanged)payload;
                    await conn.ExecuteAsync(new CommandDefinition("""
                        UPDATE spec
                        SET acceptance = (
                          SELECT jsonb_agg(
                            CASE WHEN (ac->>'id') = @acId
                                 THEN jsonb_set(ac, '{status}', to_jsonb(@status::text))
                                 ELSE ac END)
                          FROM jsonb_array_elements(acceptance) AS ac
                        )
                        WHERE id = @id;
                        """,
                        new { id = specId, acId = p.AcceptanceId, status = p.Status },
                        transaction: tx, cancellationToken: ct));
                    break;
                }
            default:
                throw new InvalidOperationException($"unknown spec event kind: {kind}");
        }

        // Recompute readiness on every mutation.
        await RecomputeReadinessAsync(conn, tx, specId, ct);
    }

    private async Task RecomputeReadinessAsync(IDbConnection conn, IDbTransaction tx, string specId, CancellationToken ct)
    {
        var row = await conn.QuerySingleAsync<(
            string non_goals, string constraints, string acceptance, string open_questions, string? context_bundle)>(
            new CommandDefinition("""
                SELECT non_goals::text, constraints::text, acceptance::text, open_questions::text, context_bundle
                FROM spec WHERE id = @id;
                """, new { id = specId }, transaction: tx, cancellationToken: ct));

        var breakdown = readiness.Compute(new ReadinessInputs(
            NonGoals: JsonSerializer.Deserialize<List<string>>(row.non_goals, jsonOptions) ?? [],
            Constraints: JsonSerializer.Deserialize<List<ConstraintRow>>(row.constraints, jsonOptions) ?? [],
            Acceptance: JsonSerializer.Deserialize<List<AcceptanceRow>>(row.acceptance, jsonOptions) ?? [],
            OpenQuestions: JsonSerializer.Deserialize<List<OpenQuestionRow>>(row.open_questions, jsonOptions) ?? [],
            ContextBundleId: row.context_bundle));

        var breakdownJson = JsonSerializer.Serialize(breakdown, jsonOptions);
        await conn.ExecuteAsync(new CommandDefinition("""
            UPDATE spec
            SET readiness_score = @score,
                readiness_breakdown = @breakdown::jsonb
            WHERE id = @id;
            """,
            new { id = specId, score = breakdown.Score, breakdown = breakdownJson },
            transaction: tx, cancellationToken: ct));
    }
}
