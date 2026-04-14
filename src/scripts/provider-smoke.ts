import { config } from "dotenv";
import type { Provider } from "../lib/ai-clients";

async function run(): Promise<void> {
  config({ path: ".env.local" });
  const { generateActionPlan, getConfiguredProviders } = await import(
    "../lib/ai-clients"
  );

  const providers = getConfiguredProviders();
  if (providers.length === 0) {
    console.log("No configured providers found in .env.local");
    process.exitCode = 1;
    return;
  }

  console.log(`Configured providers: ${providers.join(", ")}`);
  let passed = 0;
  for (const provider of providers) {
    try {
      const result = await generateActionPlan(
        "# Smoke Test\n\nReturn a minimal valid action plan.",
        provider as Provider
      );
      passed += 1;
      console.log(`[OK] ${provider} -> ${result.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[FAIL] ${provider} -> ${message}`);
    }
  }

  if (passed !== providers.length) {
    process.exitCode = 1;
  }
}

run();
