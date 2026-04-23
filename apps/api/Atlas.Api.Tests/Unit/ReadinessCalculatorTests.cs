using System.Text.Json;
using Atlas.Api.Readiness;
using FluentAssertions;

namespace Atlas.Api.Tests.Unit;

// Covers every branch of the decisions.md §1 readiness formula.

[Trait("Category", "Unit")]
public class ReadinessCalculatorTests
{
    private static readonly IReadinessCalculator Calc = new ReadinessCalculator();

    [Fact]
    public void empty_spec_scores_only_open_questions_and_is_gated()
    {
        // Per decisions.md §1: no blocking questions -> full 10/10 on open_questions.
        // Empty spec still gates since 10 < threshold 70.
        var r = Calc.Compute(Inputs());
        r.Score.Should().Be(10);
        r.Gated.Should().BeTrue();
        r.Threshold.Should().Be(70);
    }

    [Fact]
    public void one_acceptance_scores_33_percent_of_40()
    {
        var r = Calc.Compute(Inputs(acceptance: [Crit("property")]));
        r.Components.AcceptanceStructure.Score.Should().BeApproximately(40 * 0.33, 0.01);
    }

    [Fact]
    public void two_acceptance_scores_66_percent_of_40()
    {
        var r = Calc.Compute(Inputs(acceptance: [Crit("property"), Crit("bdd")]));
        r.Components.AcceptanceStructure.Score.Should().BeApproximately(40 * 0.66, 0.01);
    }

    [Fact]
    public void three_acceptance_with_property_or_integration_scores_full_40()
    {
        var r = Calc.Compute(Inputs(acceptance: [Crit("property"), Crit("bdd"), Crit("manual")]));
        r.Components.AcceptanceStructure.Score.Should().Be(40);
    }

    [Fact]
    public void three_acceptance_without_property_or_integration_caps_at_80_pct()
    {
        var r = Calc.Compute(Inputs(acceptance: [Crit("bdd"), Crit("manual"), Crit("eval")]));
        r.Components.AcceptanceStructure.Score.Should().BeApproximately(40 * 0.8, 0.01);
        r.Components.AcceptanceStructure.Notes.Should().ContainMatch("*no property/integration*");
    }

    [Fact]
    public void non_goals_below_five_words_do_not_count()
    {
        var r = Calc.Compute(Inputs(nonGoals: ["too short", "also short"]));
        r.Components.NonGoalsPresent.Score.Should().Be(0);
    }

    [Fact]
    public void two_qualifying_non_goals_reach_full_20()
    {
        var r = Calc.Compute(Inputs(nonGoals: [
            "We will not support international addresses at all",
            "We will not modify the fraud scoring pipeline"
        ]));
        r.Components.NonGoalsPresent.Score.Should().Be(20);
    }

    [Fact]
    public void constraints_without_budget_score_half()
    {
        var r = Calc.Compute(Inputs(constraints: [new ConstraintRow("c1", "text", "performance", null)]));
        r.Components.ConstraintsSpecific.Score.Should().Be(10); // 0.5 * 20
    }

    [Fact]
    public void constraints_with_numeric_budget_score_full_20()
    {
        var budget = JsonSerializer.Deserialize<JsonElement>("""{"metric":"lat","op":"<","value":90,"unit":"s"}""");
        var r = Calc.Compute(Inputs(constraints: [new ConstraintRow("c1", "text", "performance", budget)]));
        r.Components.ConstraintsSpecific.Score.Should().Be(20);
    }

    [Fact]
    public void open_questions_without_blocking_score_full()
    {
        var r = Calc.Compute(Inputs(openQuestions: [
            new OpenQuestionRow("q1", "trivial", "open", BlocksSpawn: false)
        ]));
        r.Components.OpenQuestions.Score.Should().Be(10);
    }

    [Fact]
    public void half_resolved_blocking_questions_round_down_to_nearest_tenth()
    {
        var r = Calc.Compute(Inputs(openQuestions: [
            new OpenQuestionRow("q1", "a", "resolved", BlocksSpawn: true),
            new OpenQuestionRow("q2", "b", "open",     BlocksSpawn: true),
            new OpenQuestionRow("q3", "c", "open",     BlocksSpawn: true),
        ]));
        // 1/3 = 0.333 -> rounded down to 0.3 -> 0.3 * 10 = 3.0
        r.Components.OpenQuestions.Score.Should().BeApproximately(3.0, 0.01);
    }

    [Fact]
    public void context_bundle_absent_scores_zero()
    {
        var r = Calc.Compute(Inputs(contextBundleId: null));
        r.Components.ContextBundle.Score.Should().Be(0);
    }

    [Fact]
    public void context_bundle_attached_scores_half_in_phase_1_stub()
    {
        var r = Calc.Compute(Inputs(contextBundleId: "bun_s142"));
        r.Components.ContextBundle.Score.Should().Be(5); // 0.5 * 10
    }

    [Fact]
    public void fully_specified_spec_reaches_threshold()
    {
        var r = Calc.Compute(Inputs(
            acceptance: [Crit("property"), Crit("integration"), Crit("bdd")],
            nonGoals: [
                "Not handling international addresses in this bet",
                "Not touching the fraud scoring pipeline for now"
            ],
            constraints: [new ConstraintRow("c1", "p95 below 120ms", "performance",
                JsonSerializer.Deserialize<JsonElement>("""{"metric":"p95","op":"<","value":120,"unit":"ms"}"""))],
            openQuestions: [],
            contextBundleId: "bun_1"));
        // 40 + 20 + 20 + 10 + 5 = 95
        r.Score.Should().Be(95);
        r.Gated.Should().BeFalse();
    }

    [Fact]
    public void draft_below_threshold_is_gated()
    {
        var r = Calc.Compute(Inputs(
            acceptance: [Crit("property")],
            nonGoals: ["Not handling international addresses for this release"],
            constraints: [new ConstraintRow("c1", "only text", "performance", null)]));
        r.Score.Should().BeLessThan(70);
        r.Gated.Should().BeTrue();
    }

    // ─── helpers ──────────────────────────────────────────────────────────

    private static ReadinessInputs Inputs(
        IReadOnlyList<string>? nonGoals = null,
        IReadOnlyList<ConstraintRow>? constraints = null,
        IReadOnlyList<AcceptanceRow>? acceptance = null,
        IReadOnlyList<OpenQuestionRow>? openQuestions = null,
        string? contextBundleId = null) =>
        new(
            NonGoals: nonGoals ?? [],
            Constraints: constraints ?? [],
            Acceptance: acceptance ?? [],
            OpenQuestions: openQuestions ?? [],
            ContextBundleId: contextBundleId);

    private static AcceptanceRow Crit(string testType, string status = "unverified") =>
        new("ac_" + Guid.NewGuid().ToString("N")[..4], "a statement", testType, status);
}
