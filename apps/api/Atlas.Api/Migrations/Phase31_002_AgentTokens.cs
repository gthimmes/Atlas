using FluentMigrator;

namespace Atlas.Api.Migrations;

// Phase 3.1: bearer tokens for agent identities on the MCP surface.
// Stored as SHA-256 hex digests; the plaintext (atk_*) is shown once at
// issuance and never persisted. OAuth 2.1 + PKCE (decisions.md §2)
// replaces direct issuance in a later Phase 3 slice — this table then
// becomes the backing store for OpenIddict-minted reference tokens.
[Migration(202606110001, "Agent bearer tokens")]
public sealed class Phase31_002_AgentTokens : Migration
{
    public override void Up()
    {
        Execute.Sql("""
            CREATE TABLE agent_token (
              id            TEXT PRIMARY KEY,
              agent         TEXT NOT NULL REFERENCES agent_identity(id) ON DELETE CASCADE,
              token_hash    TEXT NOT NULL UNIQUE,
              label         TEXT,
              created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
              revoked_at    TIMESTAMPTZ,
              last_used_at  TIMESTAMPTZ
            );
        """);
        Execute.Sql("CREATE INDEX agent_token_agent_idx ON agent_token(agent);");
    }

    public override void Down()
    {
        Execute.Sql("DROP TABLE IF EXISTS agent_token CASCADE;");
    }
}
