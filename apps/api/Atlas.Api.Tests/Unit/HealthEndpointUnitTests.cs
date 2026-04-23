using Atlas.Api.Endpoints;
using FluentAssertions;

namespace Atlas.Api.Tests.Unit;

[Trait("Category", "Unit")]
public class HealthEndpointUnitTests
{
    [Fact]
    public void HealthResponse_has_required_fields()
    {
        var r = new HealthResponse("ok", "atlas-api", "1.0.0.0");
        r.Status.Should().Be("ok");
        r.Component.Should().Be("atlas-api");
        r.Detail.Should().Be("1.0.0.0");
    }
}
