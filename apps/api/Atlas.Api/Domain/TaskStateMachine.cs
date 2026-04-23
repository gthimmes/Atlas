namespace Atlas.Api.Domain;

// Pure functions for Task status transitions. Schema.ts TaskStatus:
//   proposed | ready | in_flight | blocked | review | done | cancelled
//
// Legal transitions (intent):
//   proposed   → ready | cancelled
//   ready      → in_flight | blocked | cancelled
//   in_flight  → review | blocked | cancelled
//   blocked    → ready | in_flight | cancelled
//   review     → in_flight (rework) | done | blocked
//   done       → (terminal; no transitions except reopen via new task)
//   cancelled  → (terminal)

public static class TaskStateMachine
{
    public const string Proposed = "proposed";
    public const string Ready = "ready";
    public const string InFlight = "in_flight";
    public const string Blocked = "blocked";
    public const string Review = "review";
    public const string Done = "done";
    public const string Cancelled = "cancelled";

    public static bool CanTransition(string from, string to) => (from, to) switch
    {
        (Proposed, Ready) => true,
        (Proposed, Cancelled) => true,
        (Ready, InFlight) => true,
        (Ready, Blocked) => true,
        (Ready, Cancelled) => true,
        (InFlight, Review) => true,
        (InFlight, Blocked) => true,
        (InFlight, Cancelled) => true,
        (Blocked, Ready) => true,
        (Blocked, InFlight) => true,
        (Blocked, Cancelled) => true,
        (Review, InFlight) => true,
        (Review, Done) => true,
        (Review, Blocked) => true,
        // Identity is allowed -- setting status to the current value is a no-op.
        _ when from == to => true,
        _ => false,
    };

    public static bool IsTerminal(string status) => status is Done or Cancelled;

    public static IReadOnlySet<string> All { get; } =
        new HashSet<string> { Proposed, Ready, InFlight, Blocked, Review, Done, Cancelled };
}
