using Atlas.Api.Domain;
using FluentAssertions;

namespace Atlas.Api.Tests.Unit;

[Trait("Category", "Unit")]
public class TaskStateMachineTests
{
    [Theory]
    [InlineData(TaskStateMachine.Proposed, TaskStateMachine.Ready, true)]
    [InlineData(TaskStateMachine.Proposed, TaskStateMachine.Cancelled, true)]
    [InlineData(TaskStateMachine.Proposed, TaskStateMachine.InFlight, false)]
    [InlineData(TaskStateMachine.Proposed, TaskStateMachine.Done, false)]
    [InlineData(TaskStateMachine.Ready, TaskStateMachine.InFlight, true)]
    [InlineData(TaskStateMachine.Ready, TaskStateMachine.Blocked, true)]
    [InlineData(TaskStateMachine.Ready, TaskStateMachine.Cancelled, true)]
    [InlineData(TaskStateMachine.Ready, TaskStateMachine.Done, false)]
    [InlineData(TaskStateMachine.Ready, TaskStateMachine.Review, false)]
    [InlineData(TaskStateMachine.InFlight, TaskStateMachine.Review, true)]
    [InlineData(TaskStateMachine.InFlight, TaskStateMachine.Blocked, true)]
    [InlineData(TaskStateMachine.InFlight, TaskStateMachine.Cancelled, true)]
    [InlineData(TaskStateMachine.InFlight, TaskStateMachine.Done, false)]
    [InlineData(TaskStateMachine.Blocked, TaskStateMachine.Ready, true)]
    [InlineData(TaskStateMachine.Blocked, TaskStateMachine.InFlight, true)]
    [InlineData(TaskStateMachine.Blocked, TaskStateMachine.Cancelled, true)]
    [InlineData(TaskStateMachine.Blocked, TaskStateMachine.Done, false)]
    [InlineData(TaskStateMachine.Review, TaskStateMachine.Done, true)]
    [InlineData(TaskStateMachine.Review, TaskStateMachine.InFlight, true)]
    [InlineData(TaskStateMachine.Review, TaskStateMachine.Blocked, true)]
    [InlineData(TaskStateMachine.Review, TaskStateMachine.Cancelled, false)]
    [InlineData(TaskStateMachine.Done, TaskStateMachine.InFlight, false)]
    [InlineData(TaskStateMachine.Done, TaskStateMachine.Review, false)]
    [InlineData(TaskStateMachine.Cancelled, TaskStateMachine.Ready, false)]
    [InlineData(TaskStateMachine.Cancelled, TaskStateMachine.InFlight, false)]
    public void CanTransition_enforces_legal_edges(string from, string to, bool expected)
    {
        TaskStateMachine.CanTransition(from, to).Should().Be(expected);
    }

    [Fact]
    public void identity_transition_is_always_allowed()
    {
        foreach (var s in TaskStateMachine.All)
            TaskStateMachine.CanTransition(s, s).Should().BeTrue($"{s} → {s} should be a no-op");
    }

    [Fact]
    public void Done_and_Cancelled_are_terminal()
    {
        TaskStateMachine.IsTerminal(TaskStateMachine.Done).Should().BeTrue();
        TaskStateMachine.IsTerminal(TaskStateMachine.Cancelled).Should().BeTrue();
        TaskStateMachine.IsTerminal(TaskStateMachine.InFlight).Should().BeFalse();
    }

    [Fact]
    public void from_terminal_no_other_transition_is_legal()
    {
        foreach (var terminal in new[] { TaskStateMachine.Done, TaskStateMachine.Cancelled })
            foreach (var other in TaskStateMachine.All.Where(s => s != terminal))
                TaskStateMachine.CanTransition(terminal, other).Should().BeFalse(
                    $"{terminal} is terminal, transition to {other} should be rejected");
    }
}
