using Atlas.Api.Auth;
using FluentAssertions;

namespace Atlas.Api.Tests.Unit;

[Trait("Category", "Unit")]
public sealed class AgentTokensTests
{
    [Fact]
    public void Hash_is_deterministic_lowercase_hex()
    {
        var a = AgentTokens.Hash("atk_dev_agt_be");
        var b = AgentTokens.Hash("atk_dev_agt_be");

        a.Should().Be(b);
        a.Should().MatchRegex("^[0-9a-f]{64}$");
    }

    [Fact]
    public void Hash_differs_per_token()
    {
        AgentTokens.Hash("atk_dev_agt_be").Should().NotBe(AgentTokens.Hash("atk_dev_agt_fe"));
    }

    [Theory]
    [InlineData("atk_dev_agt_be", true)]
    [InlineData("atk_0123456789abcdef", true)]
    [InlineData("atk_x", false)] // too short
    [InlineData("tok_dev_agt_be", false)] // wrong prefix
    [InlineData("", false)]
    public void LooksLikeToken_enforces_prefix_and_length(string candidate, bool expected)
    {
        AgentTokens.LooksLikeToken(candidate).Should().Be(expected);
    }
}
