import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export type Provider = "openai" | "perplexity" | "gemini" | "openrouter";

interface ProviderConfig {
  apiKey: string | undefined;
  endpoint: string;
  model: string;
}

const PROVIDER_CONFIGS: Record<Provider, ProviderConfig> = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o",
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY,
    endpoint: "https://api.perplexity.ai/chat/completions",
    model: "sonar",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.0-flash",
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "anthropic/claude-3.5-sonnet:beta",
  },
};

export interface Milestone {
  title: string;
  category: string;
  priority: "high" | "medium" | "low";
  done_when: string;
}

export interface MasterActionPlan {
  title: string;
  summary: string;
  implementation_document: string; // The cohesive, detailed markdown guide
  milestones: Milestone[]; // High-level tracking points
}

export type ActionPlanResult = MasterActionPlan;

export function getAvailableProviders(): Provider[] {
  return Object.keys(PROVIDER_CONFIGS) as Provider[];
}

export function getConfiguredProviders(): Provider[] {
  return (Object.entries(PROVIDER_CONFIGS) as [Provider, ProviderConfig][])
    .filter(([, config]) => !!config.apiKey)
    .map(([name]) => name);
}

/**
 * Robustly parses JSON from AI responses, handling unescaped newlines 
 * and extra text around the JSON block.
 */
function parseRobustJson(content: string): any {
  // 1. Clean markdown fences
  let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // 2. Find the first '{' and last '}' to isolate the JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in AI response");
  }
  cleaned = cleaned.substring(start, end + 1);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 3. If standard parse fails, try to fix common AI JSON errors:
    // Specifically unescaped newlines within string literals.
    // This regex looks for newlines that are NOT preceded by a backslash
    // and attempts to replace them with the escape sequence \n.
    // We only want to do this inside quotes, but a simpler approach is to
    // replace all literal newlines that look like they are breaking a string.
    
    // Attempted fix for "Bad control character in string literal":
    // This is a common issue where the AI provides a raw newline inside a "..." string.
    const fixed = cleaned
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
    
    // After escaping everything, we might have accidentally escaped the structural newlines.
    // However, JSON.parse handles escaped whitespace between tokens just fine 
    // IF it's not actually structural (like a literal newline outside a string).
    // Actually, replacing ALL newlines with \n inside the whole string 
    // makes it one giant line, which is valid JSON.
    try {
      return JSON.parse(fixed);
    } catch (e2) {
      console.error("Failed to parse fixed JSON:", fixed);
      throw new Error(`JSON parse error: ${(e as Error).message}. Position: ${(e as any).at}`);
    }
  }
}

export async function generateActionPlan(
  markdown: string,
  provider: Provider
): Promise<ActionPlanResult> {
  const config = PROVIDER_CONFIGS[provider];
  if (!config.apiKey) {
    throw new Error(`API key not configured for ${provider}`);
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(markdown) },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${provider} API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`No content in ${provider} response`);
  }

  return parseRobustJson(content) as ActionPlanResult;
}
