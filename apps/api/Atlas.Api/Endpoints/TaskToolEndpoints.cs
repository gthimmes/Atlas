using Atlas.Api.Domain;

namespace Atlas.Api.Endpoints;

public static class TaskToolEndpoints
{
    public static IEndpointRouteBuilder MapTaskToolEndpoints(this IEndpointRouteBuilder routes)
    {
        var tools = routes.MapGroup("/v1/tools").WithTags("tools");
        tools.MapPost("/task.create", CreateTask).WithName("TaskCreate");
        tools.MapPost("/task.update", UpdateTask).WithName("TaskUpdate");
        return routes;
    }

    private static async Task<IResult> CreateTask(
        TaskCreateRequest req,
        TaskToolService service,
        HttpContext http,
        CancellationToken ct)
    {
        var outcome = await service.CreateAsync(req, http.User.Identity?.Name, ct);
        return outcome.IsOk
            ? Results.Created($"/v1/tasks/{outcome.Value}", new { id = outcome.Value })
            : ToError(outcome.Error!);
    }

    private static async Task<IResult> UpdateTask(
        TaskUpdateRequest req,
        TaskToolService service,
        HttpContext http,
        CancellationToken ct)
    {
        var outcome = await service.UpdateAsync(req, http.User.Identity?.Name, ct);
        return outcome.IsOk
            ? Results.Ok(new { id = outcome.Value })
            : ToError(outcome.Error!);
    }

    private static IResult ToError(ToolError error) =>
        Results.Json(
            new { error = new { code = error.Code, message = error.Message, retryable = error.Retryable } },
            statusCode: error.HttpStatus);
}
