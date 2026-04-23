using FluentMigrator;

namespace Atlas.Api.Migrations;

// 202604230001 -- YYYYMMDDHHmm format keeps migrations orderable forever.
[Migration(202604230001, "Event log + initial read-model tables")]
public sealed class Initial_001_EventLog : Migration
{
    public override void Up()
    {
        // ─── Append-only event log (source of truth) ───────────────────
        Execute.Sql("""
            CREATE TABLE event_log (
              id              BIGSERIAL PRIMARY KEY,
              aggregate_type  TEXT        NOT NULL,
              aggregate_id    TEXT        NOT NULL,
              kind            TEXT        NOT NULL,
              payload         JSONB       NOT NULL,
              actor           TEXT        NOT NULL,
              actor_kind      TEXT        NOT NULL CHECK (actor_kind IN ('human','agent','system')),
              at              TIMESTAMPTZ NOT NULL DEFAULT now(),
              causation_id    BIGINT      REFERENCES event_log(id),
              correlation_id  UUID        NOT NULL DEFAULT gen_random_uuid()
            );
        """);
        Execute.Sql("CREATE INDEX event_log_aggregate_idx ON event_log(aggregate_type, aggregate_id, id);");
        Execute.Sql("CREATE INDEX event_log_at_idx ON event_log(at);");
        Execute.Sql("CREATE INDEX event_log_correlation_idx ON event_log(correlation_id);");

        // ─── Workspaces / projects / users / agents ────────────────────
        Execute.Sql("""
            CREATE TABLE workspace (
              id                       TEXT PRIMARY KEY,
              name                     TEXT NOT NULL,
              slug                     TEXT NOT NULL UNIQUE,
              plan                     TEXT NOT NULL,
              acu_per_week             INTEGER NOT NULL,
              default_cool_down_weeks  INTEGER NOT NULL DEFAULT 2,
              default_bet_weeks        INTEGER NOT NULL DEFAULT 6,
              notification_model       TEXT NOT NULL DEFAULT 'digest',
              spec_sync                JSONB NOT NULL,
              adr_sync                 JSONB NOT NULL,
              created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        """);

        Execute.Sql("""
            CREATE TABLE project (
              id          TEXT PRIMARY KEY,
              workspace   TEXT NOT NULL REFERENCES workspace(id),
              slug        TEXT NOT NULL,
              name        TEXT NOT NULL,
              created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
              UNIQUE (workspace, slug)
            );
        """);

        Execute.Sql("""
            CREATE TABLE atlas_user (
              id          TEXT PRIMARY KEY,
              workspace   TEXT NOT NULL REFERENCES workspace(id),
              email       TEXT NOT NULL,
              name        TEXT NOT NULL,
              role        TEXT NOT NULL,
              created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
              UNIQUE (workspace, email)
            );
        """);

        Execute.Sql("""
            CREATE TABLE agent_identity (
              id             TEXT PRIMARY KEY,
              workspace      TEXT NOT NULL REFERENCES workspace(id),
              handle         TEXT NOT NULL,
              model          TEXT NOT NULL,
              oauth_issuer   TEXT NOT NULL,
              owner          TEXT NOT NULL REFERENCES atlas_user(id),
              description    TEXT,
              approved       BOOLEAN NOT NULL DEFAULT FALSE,
              trust_history  JSONB NOT NULL DEFAULT '[]'::jsonb,
              stats          JSONB NOT NULL DEFAULT '{}'::jsonb,
              UNIQUE (workspace, handle)
            );
        """);

        // ─── Specs + tasks (Phase 1 read models) ───────────────────────
        Execute.Sql("""
            CREATE TABLE spec (
              id                  TEXT PRIMARY KEY,
              workspace           TEXT NOT NULL REFERENCES workspace(id),
              project             TEXT NOT NULL REFERENCES project(id),
              pitch               TEXT,
              parent_spec         TEXT REFERENCES spec(id),
              title               TEXT NOT NULL,
              slug                TEXT NOT NULL,
              status              TEXT NOT NULL,
              version             INTEGER NOT NULL,
              head_sha            TEXT NOT NULL,
              intent              TEXT,
              non_goals           JSONB NOT NULL DEFAULT '[]'::jsonb,
              constraints         JSONB NOT NULL DEFAULT '[]'::jsonb,
              acceptance          JSONB NOT NULL DEFAULT '[]'::jsonb,
              decisions           JSONB NOT NULL DEFAULT '[]'::jsonb,
              open_questions      JSONB NOT NULL DEFAULT '[]'::jsonb,
              context_bundle      TEXT,
              readiness_score     INTEGER NOT NULL DEFAULT 0,
              readiness_breakdown JSONB NOT NULL,
              task_ids            JSONB NOT NULL DEFAULT '[]'::jsonb,
              actor_summary       JSONB NOT NULL DEFAULT '{"humans":[],"agents":[]}'::jsonb,
              repo_path           TEXT,
              owner               TEXT NOT NULL REFERENCES atlas_user(id),
              created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
              created_by          TEXT NOT NULL REFERENCES atlas_user(id),
              updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
              shipped_at          TIMESTAMPTZ,
              UNIQUE (workspace, slug)
            );
        """);
        Execute.Sql("CREATE INDEX spec_workspace_idx ON spec(workspace);");
        Execute.Sql("CREATE INDEX spec_status_idx ON spec(status);");

        Execute.Sql("""
            CREATE TABLE task (
              id                       TEXT PRIMARY KEY,
              workspace                TEXT NOT NULL REFERENCES workspace(id),
              parent_spec              TEXT NOT NULL REFERENCES spec(id),
              parent_task              TEXT REFERENCES task(id),
              title                    TEXT NOT NULL,
              description              TEXT,
              status                   TEXT NOT NULL,
              assignee                 TEXT NOT NULL REFERENCES atlas_user(id),
              delegated_to             TEXT,
              delegation_history       JSONB NOT NULL DEFAULT '[]'::jsonb,
              blocks                   JSONB NOT NULL DEFAULT '[]'::jsonb,
              blocked_by               JSONB NOT NULL DEFAULT '[]'::jsonb,
              context_bundle_override  TEXT,
              agent_budget             JSONB,
              risk                     TEXT NOT NULL DEFAULT 'green',
              paths                    JSONB NOT NULL DEFAULT '[]'::jsonb,
              proposed_by              TEXT NOT NULL,
              approved_by              TEXT REFERENCES atlas_user(id),
              created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
              updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
              completed_at             TIMESTAMPTZ
            );
        """);
        Execute.Sql("CREATE INDEX task_spec_idx ON task(parent_spec);");
        Execute.Sql("CREATE INDEX task_status_idx ON task(status);");
    }

    public override void Down()
    {
        Execute.Sql("DROP TABLE IF EXISTS task CASCADE;");
        Execute.Sql("DROP TABLE IF EXISTS spec CASCADE;");
        Execute.Sql("DROP TABLE IF EXISTS agent_identity CASCADE;");
        Execute.Sql("DROP TABLE IF EXISTS atlas_user CASCADE;");
        Execute.Sql("DROP TABLE IF EXISTS project CASCADE;");
        Execute.Sql("DROP TABLE IF EXISTS workspace CASCADE;");
        Execute.Sql("DROP TABLE IF EXISTS event_log CASCADE;");
    }
}
