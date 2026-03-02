import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load .env.local before anything reads process.env
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  generateActionPlan,
  getAvailableProviders,
  getConfiguredProviders,
  type Provider,
} from "./lib/ai-clients.js";

const server = new McpServer({
  name: "markdown-to-action-plan",
  version: "1.0.0",
});

server.tool(
  "list_providers",
  "List which AI providers are configured and available (based on API keys in environment)",
  {},
  async () => {
    const providers = getConfiguredProviders();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ providers }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "generate_action_plan",
  "Convert markdown content into a single cohesive master action plan document with tracking milestones",
  {
    markdown: z.string().describe("The markdown content to analyze"),
    provider: z
      .enum(["openai", "perplexity", "gemini", "openrouter"])
      .optional()
      .describe(
        "AI provider to use. Defaults to first available if not specified."
      ),
  },
  async ({ markdown, provider }) => {
    const configured = getConfiguredProviders();
    if (configured.length === 0 && !provider) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No AI providers configured. Set OPENAI_API_KEY, PERPLEXITY_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.",
          },
        ],
        isError: true,
      };
    }

    const available = getAvailableProviders();
    const selectedProvider: Provider =
      provider && available.includes(provider as Provider)
        ? (provider as Provider)
        : (configured[0] as Provider) || "openai";

    try {
      const result = await generateActionPlan(markdown, selectedProvider);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
