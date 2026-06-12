using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Atlas.Api.Infrastructure;
using Dapper;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Atlas.Api.Auth;

public static class AgentTokenDefaults
{
    public const string Scheme = "AgentToken";
    public const string TokenPrefix = "atk_";
    public const string Policy = "agent";
}

public static class AgentTokens
{
    /// <summary>SHA-256 hex digest of the plaintext token; this is what agent_token.token_hash stores.</summary>
    public static string Hash(string token) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public static bool LooksLikeToken(string value) =>
        value.StartsWith(AgentTokenDefaults.TokenPrefix, StringComparison.Ordinal) && value.Length >= 12;
}

/// <summary>
/// Authenticates `Authorization: Bearer atk_*` against the agent_token
/// table. Success yields a principal whose Name is the agent identity id
/// (agt_*) with an actor_kind=agent claim — the same actor string the
/// event log records. Tokens of revoked or unapproved agents fail.
/// </summary>
public sealed class AgentTokenAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IAtlasConnectionFactory factory)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string? header = Request.Headers.Authorization;
        if (header is null || !header.StartsWith("Bearer ", StringComparison.Ordinal))
            return AuthenticateResult.NoResult();

        var token = header["Bearer ".Length..].Trim();
        if (!AgentTokens.LooksLikeToken(token))
            return AuthenticateResult.NoResult();

        using var conn = factory.Open();
        var agentId = await conn.ExecuteScalarAsync<string?>(new CommandDefinition("""
            UPDATE agent_token t SET last_used_at = now()
            FROM agent_identity ai
            WHERE t.token_hash = @hash
              AND t.revoked_at IS NULL
              AND ai.id = t.agent
              AND ai.approved
            RETURNING t.agent;
            """, new { hash = AgentTokens.Hash(token) }, cancellationToken: Context.RequestAborted));

        if (agentId is null)
            return AuthenticateResult.Fail("unknown, revoked, or unapproved agent token");

        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, agentId), new Claim("actor_kind", "agent")],
            Scheme.Name);
        return AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.Headers.WWWAuthenticate = "Bearer";
        return base.HandleChallengeAsync(properties);
    }
}
