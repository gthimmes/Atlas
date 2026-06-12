namespace Atlas.Api.Domain;

/// <summary>
/// Transport-neutral result for tool invocations. The same domain services
/// back both the HTTP `/v1/tools/*` endpoints and the MCP `tools/call`
/// surface, so errors carry contract codes (api-contract.md) rather than
/// HTTP semantics; each transport maps them at the edge.
/// </summary>
public sealed record ToolError(string Code, string Message, bool Retryable = false)
{
    public int HttpStatus => Code switch
    {
        "E_NOT_FOUND" => 404,
        "E_POLICY_DENIED" => 403,
        "E_RATE_LIMITED" => 429,
        _ => 400,
    };
}

public sealed record ToolOutcome<T>
{
    private ToolOutcome(T? value, ToolError? error)
    {
        Value = value;
        Error = error;
    }

    public T? Value { get; }
    public ToolError? Error { get; }
    public bool IsOk => Error is null;

    public static ToolOutcome<T> Ok(T value) => new(value, null);

    public static ToolOutcome<T> Fail(string code, string message, bool retryable = false) =>
        new(default, new ToolError(code, message, retryable));
}
