import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { expect, test } from './_fixtures.js';

// Phase 3.1 playback — the M2 exit criterion, observed from the human
// side: a human drafts a spec in the UI and watches an agent (connected
// over the MCP endpoint with a bearer token) lift its readiness score
// past the threshold, live via SSE, with no page reload. The gate pill
// flips and Spawn task enables while the human is just... watching.
//
// The agent runs in --mock mode (deterministic drafts, no LLM) so this
// suite is hermetic; the identical code path with Claude drafting is
// exercised manually via `make demo-agent`.

const AGENT_DIR = path.resolve(import.meta.dirname, '../../agents/readiness-lifter');
const API = process.env.ATLAS_API_URL ?? 'http://localhost:5179';

function runLifterAgent(specId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Single command string: avoids DEP0190 (shell:true + args array).
    // specId is server-generated (spec_[a-f0-9]+), not user input.
    const child = spawn(
      `pnpm exec tsx src/cli.ts --spec ${specId} --mock --pause 700 --api ${API}`,
      { cwd: AGENT_DIR, shell: true, stdio: 'inherit' },
    );
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? -1));
  });
}

test.describe('Phase 3.1 -- agent lifts a gated spec over MCP', () => {
  test('human watches readiness climb live while the agent works', async ({ page }) => {
    test.setTimeout(120_000);

    // 1. Human creates a draft spec in the UI. Fresh drafts score 10, gated.
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('atlas.view', 'graph'));
    await page.reload();
    await page.getByTestId('new-spec-button').click();

    const title = `Agent lift ${Date.now()}`;
    const createResponse = page.waitForResponse('**/v1/tools/spec.create');
    await page.getByTestId('new-spec-title').fill(title);
    await page.getByTestId('new-spec-intent').fill('Prove an MCP agent can co-author this spec.');
    await page.getByTestId('new-spec-submit').click();
    const specId: string = (await (await createResponse).json()).id;

    await expect(page.getByTestId('surface-spec')).toBeVisible();
    await expect(page.getByTestId('readiness-score')).toHaveText('10');
    await expect(page.getByTestId('gate-pill')).toHaveAttribute('data-gated', 'true');
    await expect(page.getByTestId('spawn-task-button')).toBeDisabled();

    // 2. The agent connects over MCP and starts proposing edits. No page
    //    interaction from here on -- everything below arrives via SSE.
    const agentExit = runLifterAgent(specId);

    // First edit (acceptance criteria): 10 → 50, still gated.
    await expect(page.getByTestId('readiness-score')).toHaveText('50', { timeout: 30_000 });
    await expect(page.getByTestId('gate-pill')).toHaveAttribute('data-gated', 'true');

    // Second edit (non-goals): 50 → 70, gate lifts, Spawn enables.
    await expect(page.getByTestId('readiness-score')).toHaveText('70', { timeout: 30_000 });
    await expect(page.getByTestId('gate-pill')).toHaveAttribute('data-gated', 'false');
    await expect(page.getByTestId('spawn-task-button')).toBeEnabled();

    // 3. The agent saw the gate lift and exited cleanly.
    expect(await agentExit).toBe(0);
  });

  test('agent edits are attributed to the agent identity in the spec payload', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);

    // Create via API, lift via agent, then verify actor attribution the
    // way the UI sees it (actor_summary.agents on the spec read model).
    const projects = await request.get(`${API}/v1/projects`);
    const users = await request.get(`${API}/v1/users`);
    const projectId = (await projects.json()).items[0].id;
    const ownerId = (await users.json()).items[0].id;
    const created = await request.post(`${API}/v1/tools/spec.create`, {
      data: { title: `Attribution check ${Date.now()}`, project: projectId, owner: ownerId },
    });
    const specId = (await created.json()).id;

    expect(await runLifterAgent(specId)).toBe(0);

    const spec = await (await request.get(`${API}/v1/specs/${specId}`)).json();
    expect(spec.readiness_breakdown.gated).toBe(false);
    expect(spec.actor_summary.agents).toContain('agt_be');

    // And the editor surface renders the lifted state for the human.
    await page.goto('/');
    await page.evaluate(
      ([id]) => {
        localStorage.setItem('atlas.view', 'spec');
        localStorage.setItem('atlas.activeSpec', id);
      },
      [specId],
    );
    await page.reload();
    await expect(page.getByTestId('surface-spec')).toBeVisible();
    await expect(page.getByTestId('readiness-score')).toHaveText('70');
    await expect(page.getByTestId('gate-pill')).toHaveAttribute('data-gated', 'false');
  });
});
