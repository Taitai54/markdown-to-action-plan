/**
 * Smoke-test each configured LLM provider with a tiny markdown fixture.
 * Loads .env.local before ai-clients (required for API keys).
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const FIXTURE = `# Smoke test

## Goal
Verify the provider returns valid action-plan JSON.

## Steps
1. Open the app at http://localhost:3000
2. Upload this file
3. Click Generate

✅ Done when: a plan title and at least one milestone appear.
`;

async function main() {
  const { generateActionPlan, getConfiguredProviders } = await import(
    "../lib/ai-clients"
  );

  const providers = getConfiguredProviders();
  if (providers.length === 0) {
    console.error(
      "No providers configured. Set at least one API key in .env.local"
    );
    process.exit(1);
  }

  console.log(`Testing ${providers.length} provider(s): ${providers.join(", ")}\n`);

  let failed = 0;
  for (const provider of providers) {
    const label = provider.padEnd(12);
    try {
      const start = Date.now();
      const plan = await generateActionPlan(FIXTURE, provider, {
        systemPromptPresetId: "minimal",
      });
      const ms = Date.now() - start;
      const milestones = Array.isArray(plan.milestones) ? plan.milestones.length : 0;
      console.log(
        `  OK  ${label}  ${ms}ms  title="${plan.title.slice(0, 50)}..."  milestones=${milestones}`
      );
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${label}  ${msg}`);
    }
  }

  console.log("");
  if (failed > 0) {
    console.error(`${failed} provider(s) failed.`);
    process.exit(1);
  }
  console.log("All configured providers passed.");
}

main();
