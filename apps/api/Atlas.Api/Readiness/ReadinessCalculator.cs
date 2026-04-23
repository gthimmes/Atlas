using System.Text.Json.Serialization;

namespace Atlas.Api.Readiness;

// Implements decisions.md §1 -- "Spec Readiness Score, formula".
// Five components with defined zero bars and full-credit states, linear
// partial credit within each. Cap-at-0.8 rule for acceptance when no
// property/integration criterion exists. Threshold 70.

public interface IReadinessCalculator
{
    ReadinessBreakdown Compute(ReadinessInputs inputs);
}

public sealed class ReadinessCalculator(ReadinessWeights? weights = null, int threshold = 70) : IReadinessCalculator
{
    private readonly ReadinessWeights _w = weights ?? ReadinessWeights.Default;

    public ReadinessBreakdown Compute(ReadinessInputs inputs)
    {
        var acc = ScoreAcceptance(inputs.Acceptance);
        var nong = ScoreNonGoals(inputs.NonGoals);
        var cons = ScoreConstraints(inputs.Constraints);
        var oq = ScoreOpenQuestions(inputs.OpenQuestions);
        var cb = ScoreContextBundle(inputs.ContextBundleId);

        var total =
            acc.Fraction * _w.AcceptanceStructure +
            nong.Fraction * _w.NonGoalsPresent +
            cons.Fraction * _w.ConstraintsSpecific +
            oq.Fraction * _w.OpenQuestions +
            cb.Fraction * _w.ContextBundle;

        var score = (int)Math.Round(total, MidpointRounding.AwayFromZero);

        return new ReadinessBreakdown(
            Weights: _w,
            Components: new ReadinessComponents(
                AcceptanceStructure: new ReadinessComponent(acc.Fraction * _w.AcceptanceStructure, _w.AcceptanceStructure, acc.Notes),
                NonGoalsPresent: new ReadinessComponent(nong.Fraction * _w.NonGoalsPresent, _w.NonGoalsPresent, nong.Notes),
                ConstraintsSpecific: new ReadinessComponent(cons.Fraction * _w.ConstraintsSpecific, _w.ConstraintsSpecific, cons.Notes),
                OpenQuestions: new ReadinessComponent(oq.Fraction * _w.OpenQuestions, _w.OpenQuestions, oq.Notes),
                ContextBundle: new ReadinessComponent(cb.Fraction * _w.ContextBundle, _w.ContextBundle, cb.Notes)),
            Threshold: threshold,
            Gated: score < threshold,
            Score: score,
            ComputedAt: DateTimeOffset.UtcNow);
    }

    // ─── Acceptance structure -------------------------------------------------
    //  zero bar: 0 criteria           → 0
    //  1 criterion                    → 0.33
    //  2 criteria                     → 0.66
    //  >= 3 criteria meeting rubric   → 1.00
    //  cap at 0.8 if no property or integration criterion exists
    private static (double Fraction, List<string> Notes) ScoreAcceptance(IReadOnlyList<AcceptanceRow> criteria)
    {
        var notes = new List<string>();
        if (criteria.Count == 0)
        {
            notes.Add("no acceptance criteria");
            return (0.0, notes);
        }

        var baseFrac = criteria.Count switch
        {
            1 => 0.33,
            2 => 0.66,
            _ => 1.00,
        };

        var hasPropertyOrIntegration = criteria.Any(c =>
            string.Equals(c.TestType, "property", StringComparison.Ordinal) ||
            string.Equals(c.TestType, "integration", StringComparison.Ordinal));

        if (!hasPropertyOrIntegration && baseFrac > 0.8)
        {
            notes.Add("no property/integration criterion (cap 0.8)");
            baseFrac = 0.8;
        }

        notes.Add($"{criteria.Count} criteria; {criteria.Count(c => c.TestType is "property" or "integration")} property/integration");
        return (baseFrac, notes);
    }

    // ─── Non-goals -----------------------------------------------------------
    //  0.5 per qualifying entry (>=5 words), capped at 1.0
    private static (double Fraction, List<string> Notes) ScoreNonGoals(IReadOnlyList<string> nonGoals)
    {
        var qualifying = nonGoals.Count(n => WordCount(n) >= 5);
        var frac = Math.Min(1.0, 0.5 * qualifying);
        var notes = new List<string> { $"{qualifying} qualifying non-goals" };
        if (nonGoals.Count > qualifying) notes.Add($"{nonGoals.Count - qualifying} below 5-word threshold");
        return (frac, notes);
    }

    // ─── Constraints specific ------------------------------------------------
    //  0   if no constraints
    //  0.5 if >= 1 constraint exists without a budget
    //  1.0 if >= 1 has a budget (metric + op + value)
    private static (double Fraction, List<string> Notes) ScoreConstraints(IReadOnlyList<ConstraintRow> constraints)
    {
        var notes = new List<string>();
        if (constraints.Count == 0)
        {
            notes.Add("no constraints");
            return (0.0, notes);
        }
        var withBudget = constraints.Count(c => c.Budget is not null);
        notes.Add($"{constraints.Count} constraints; {withBudget} with numeric budgets");
        return (withBudget > 0 ? 1.0 : 0.5, notes);
    }

    // ─── Open questions ------------------------------------------------------
    //  1.0 if no blocking questions
    //  else resolved / total_blocking, rounded DOWN to nearest 0.1
    private static (double Fraction, List<string> Notes) ScoreOpenQuestions(IReadOnlyList<OpenQuestionRow> questions)
    {
        var blocking = questions.Where(q => q.BlocksSpawn).ToList();
        if (blocking.Count == 0)
            return (1.0, ["no blocking questions"]);

        var resolved = blocking.Count(q => string.Equals(q.State, "resolved", StringComparison.Ordinal));
        var ratio = (double)resolved / blocking.Count;
        // Round DOWN to nearest 0.1
        var rounded = Math.Floor(ratio * 10) / 10.0;
        return (rounded, [$"{resolved}/{blocking.Count} blocking resolved"]);
    }

    // ─── Context bundle ------------------------------------------------------
    //  0   if no bundle
    //  0.5 if bundle attached
    //  +0.3 if token estimate under workspace ceiling (placeholder: treated as under for Phase 1)
    //  +0.2 if >= 1 inclusion rule (not purely inherited) (placeholder for Phase 1)
    // Phase 1 stub: bundle attached -> 0.5. Full formula lands with Context
    // Bundle Manager in Phase 6.
    private static (double Fraction, List<string> Notes) ScoreContextBundle(string? bundleId)
    {
        if (string.IsNullOrEmpty(bundleId))
            return (0.0, ["no context bundle attached"]);
        return (0.5, ["bundle attached (full scoring lands with Context Bundle Manager)"]);
    }

    private static int WordCount(string s) =>
        string.IsNullOrWhiteSpace(s) ? 0 : s.Split([' ', '\t', '\n'], StringSplitOptions.RemoveEmptyEntries).Length;
}

// ─── Input DTOs -- projected from the spec read model ───────────────────────

public sealed record ReadinessInputs(
    IReadOnlyList<string> NonGoals,
    IReadOnlyList<ConstraintRow> Constraints,
    IReadOnlyList<AcceptanceRow> Acceptance,
    IReadOnlyList<OpenQuestionRow> OpenQuestions,
    string? ContextBundleId);

public sealed record ConstraintRow(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("category")] string Category,
    [property: JsonPropertyName("budget")] System.Text.Json.JsonElement? Budget);

public sealed record AcceptanceRow(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("statement")] string Statement,
    [property: JsonPropertyName("test_type")] string TestType,
    [property: JsonPropertyName("status")] string Status);

public sealed record OpenQuestionRow(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("state")] string State,
    [property: JsonPropertyName("blocks_spawn")] bool BlocksSpawn);

// ─── Output DTOs -- matches schema.ts ReadinessBreakdown ───────────────────

public sealed record ReadinessWeights(
    [property: JsonPropertyName("acceptance_structure")] int AcceptanceStructure,
    [property: JsonPropertyName("non_goals_present")] int NonGoalsPresent,
    [property: JsonPropertyName("constraints_specific")] int ConstraintsSpecific,
    [property: JsonPropertyName("open_questions")] int OpenQuestions,
    [property: JsonPropertyName("context_bundle")] int ContextBundle)
{
    public static ReadinessWeights Default => new(40, 20, 20, 10, 10);
}

public sealed record ReadinessComponent(
    [property: JsonPropertyName("score")] double Score,
    [property: JsonPropertyName("max")] int Max,
    [property: JsonPropertyName("notes")] IReadOnlyList<string> Notes);

public sealed record ReadinessComponents(
    [property: JsonPropertyName("acceptance_structure")] ReadinessComponent AcceptanceStructure,
    [property: JsonPropertyName("non_goals_present")] ReadinessComponent NonGoalsPresent,
    [property: JsonPropertyName("constraints_specific")] ReadinessComponent ConstraintsSpecific,
    [property: JsonPropertyName("open_questions")] ReadinessComponent OpenQuestions,
    [property: JsonPropertyName("context_bundle")] ReadinessComponent ContextBundle);

public sealed record ReadinessBreakdown(
    [property: JsonPropertyName("weights")] ReadinessWeights Weights,
    [property: JsonPropertyName("components")] ReadinessComponents Components,
    [property: JsonPropertyName("threshold")] int Threshold,
    [property: JsonPropertyName("gated")] bool Gated,
    [property: JsonPropertyName("score")] int Score,
    [property: JsonPropertyName("computed_at")] DateTimeOffset ComputedAt);
