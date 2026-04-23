using System.Text.Json.Serialization;

namespace Atlas.Api.EventSourcing;

// Event payload vocabulary for the `spec` aggregate. Each case is a concrete
// record; the `kind` column on event_log holds the discriminator so we can
// query + replay without deserializing the whole payload.

public static class SpecEventKinds
{
    public const string Created = "spec.created";
    public const string IntentEdited = "spec.intent_edited";
    public const string NonGoalsEdited = "spec.non_goals_edited";
    public const string ConstraintsEdited = "spec.constraints_edited";
    public const string AcceptanceEdited = "spec.acceptance_edited";
    public const string DecisionsEdited = "spec.decisions_edited";
    public const string OpenQuestionsEdited = "spec.open_questions_edited";
    public const string ContextBundleEdited = "spec.context_bundle_edited";
    public const string AcceptanceStatusChanged = "spec.acceptance_status_changed";
}

public sealed record SpecCreated(
    [property: JsonPropertyName("workspace")] string Workspace,
    [property: JsonPropertyName("project")] string Project,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("slug")] string Slug,
    [property: JsonPropertyName("owner")] string Owner);

public sealed record SpecIntentEdited(
    [property: JsonPropertyName("intent")] string? Intent);

public sealed record SpecNonGoalsEdited(
    [property: JsonPropertyName("non_goals")] IReadOnlyList<string> NonGoals);

public sealed record SpecConstraintsEdited(
    [property: JsonPropertyName("constraints")] System.Text.Json.JsonElement Constraints);

public sealed record SpecAcceptanceEdited(
    [property: JsonPropertyName("acceptance")] System.Text.Json.JsonElement Acceptance);

public sealed record SpecDecisionsEdited(
    [property: JsonPropertyName("decisions")] IReadOnlyList<string> Decisions);

public sealed record SpecOpenQuestionsEdited(
    [property: JsonPropertyName("open_questions")] System.Text.Json.JsonElement OpenQuestions);

public sealed record SpecContextBundleEdited(
    [property: JsonPropertyName("context_bundle")] string? ContextBundle);

public sealed record SpecAcceptanceStatusChanged(
    [property: JsonPropertyName("acceptance_id")] string AcceptanceId,
    [property: JsonPropertyName("status")] string Status);
