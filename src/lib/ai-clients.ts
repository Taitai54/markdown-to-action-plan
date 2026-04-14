import { buildUserPrompt, getSystemPromptForPreset, DEFAULT_SYSTEM_PROMPT_PRESET_ID } from "./prompt";
import type { SystemPromptPresetId } from "./prompt";

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
    model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
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
 * Fix unescaped double quotes inside JSON string values. When the LLM outputs
 * a " inside a string without escaping it, the parser fails with "Expected ',' or '}' after property value".
 * We escape any " that appears inside a string value (after an unescaped opening ") when the next
 * token suggests it was meant to be literal (e.g. followed by more text or another ").
 */
function fixUnescapedQuotesInStrings(str: string): string {
  const out: string[] = [];
  let i = 0;
  let inString = false;
  while (i < str.length) {
    const c = str[i];
    if (!inString) {
      out.push(c);
      if (c === '"') inString = true;
      i += 1;
      continue;
    }
    if (c === "\\") {
      out.push(c);
      i += 1;
      if (i < str.length) {
        out.push(str[i]);
        i += 1;
      }
      continue;
    }
    if (c === '"') {
      let backslashes = 0;
      let j = out.length - 1;
      while (j >= 0 && out[j] === "\\") {
        backslashes += 1;
        j -= 1;
      }
      if (backslashes % 2 === 1) {
        out.push(c);
        i += 1;
        continue;
      }
      const rest = str.slice(i + 1);
      const nextStructural = rest.match(/^\s*([,:\]\}])/);
      if (nextStructural) {
        out.push(c);
        i += 1;
        inString = false;
        continue;
      }
      const nextQuoteOrWord = rest.match(/^\s*["a-zA-Z0-9]/);
      if (nextQuoteOrWord) {
        out.push("\\", c);
        i += 1;
        continue;
      }
      out.push(c);
      i += 1;
      inString = false;
      continue;
    }
    out.push(c);
    i += 1;
  }
  return out.join("");
}

/**
 * Fix invalid JSON escape sequences. Valid in JSON: \" \\ \/ \b \f \n \r \t \uXXXX.
 * Any other \ + char (or \u not followed by 4 hex digits) causes "Bad escaped character".
 */
function fixInvalidJsonEscapes(str: string): string {
  let i = 0;
  const out: string[] = [];
  while (i < str.length) {
    if (str[i] !== "\\") {
      out.push(str[i]);
      i += 1;
      continue;
    }
    const next = str[i + 1];
    if (next === undefined) {
      out.push("\\\\");
      i += 1;
      continue;
    }
    if (/["\\/bfnrt]/.test(next)) {
      out.push("\\", next);
      i += 2;
      continue;
    }
    if (next === "u") {
      const hex = str.slice(i + 2, i + 6);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        out.push("\\u", hex);
        i += 6;
        continue;
      }
    }
    out.push("\\\\", next);
    i += 2;
  }
  return out.join("");
}

/**
 * Robustly parses JSON from AI responses, handling unescaped newlines,
 * invalid escape sequences, and extra text around the JSON block.
 */
function parseRobustJson(content: string): unknown {
  // 1. Clean markdown fences
  let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // 2. Find the first '{' and last '}' to isolate the JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in AI response");
  }
  cleaned = cleaned.substring(start, end + 1);

  // 3. Fix invalid escape sequences, then unescaped quotes inside strings
  cleaned = fixInvalidJsonEscapes(cleaned);
  cleaned = fixUnescapedQuotesInStrings(cleaned);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const err = e as Error;
    // 4. If standard parse fails, try to fix unescaped control chars in string literals.
    const fixed = escapeControlCharsInStrings(cleaned);

    try {
      return JSON.parse(fixed);
    } catch {
      console.error("Failed to parse fixed JSON (length:", fixed.length, "):", fixed.slice(0, 500) + "...");
      throw new Error(`JSON parse error: ${err.message}`);
    }
  }
}

function escapeControlCharsInStrings(str: string): string {
  const out: string[] = [];
  let inString = false;

  for (let i = 0; i < str.length; i += 1) {
    const c = str[i];

    if (c === '"' && !isEscaped(str, i)) {
      inString = !inString;
      out.push(c);
      continue;
    }

    if (inString) {
      if (c === "\n") {
        out.push("\\n");
        continue;
      }
      if (c === "\r") {
        out.push("\\r");
        continue;
      }
      if (c === "\t") {
        out.push("\\t");
        continue;
      }
    }

    out.push(c);
  }

  return out.join("");
}

function isEscaped(str: string, quoteIndex: number): boolean {
  let backslashes = 0;
  for (let i = quoteIndex - 1; i >= 0 && str[i] === "\\"; i -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateActionPlan(value: unknown): MasterActionPlan {
  if (!isRecord(value)) {
    throw new Error("AI output validation failed: root must be an object");
  }

  const { title, summary, implementation_document, milestones } = value;
  if (
    typeof title !== "string" ||
    typeof summary !== "string" ||
    typeof implementation_document !== "string"
  ) {
    throw new Error("AI output validation failed: title, summary, and implementation_document must be strings");
  }

  const parsedMilestones: Milestone[] = normalizeMilestones(milestones);

  return {
    title,
    summary,
    implementation_document,
    milestones: parsedMilestones,
  };
}

function normalizeMilestones(milestones: unknown): Milestone[] {
  if (!Array.isArray(milestones)) {
    return [];
  }

  const parsedMilestones: Milestone[] = milestones.flatMap((milestone, index) => {
    if (!isRecord(milestone)) {
      console.warn(`Skipping invalid milestone at index ${index}: not an object`);
      return [];
    }

    const priority = milestone.priority;
    if (
      typeof milestone.title !== "string" ||
      typeof milestone.category !== "string" ||
      typeof milestone.done_when !== "string"
    ) {
      console.warn(`Skipping invalid milestone at index ${index}: missing required fields`);
      return [];
    }

    const normalizedPriority: Milestone["priority"] =
      priority === "high" || priority === "medium" || priority === "low"
        ? priority
        : "medium";

    return [{
      title: milestone.title,
      category: milestone.category,
      priority: normalizedPriority,
      done_when: milestone.done_when,
    }];
  });

  return parsedMilestones;
}

export async function generateActionPlan(
  markdown: string,
  provider: Provider,
  options?: {
    userPromptOverride?: string;
    systemPromptOverride?: string;
    systemPromptPresetId?: SystemPromptPresetId;
    modelOverride?: string;
  }
): Promise<ActionPlanResult> {
  const config = PROVIDER_CONFIGS[provider];
  if (!config.apiKey) {
    throw new Error(`API key not configured for ${provider}`);
  }

  const userContent =
    options?.userPromptOverride != null && options.userPromptOverride !== ""
      ? options.userPromptOverride
      : buildUserPrompt(markdown);

  const systemContent =
    options?.systemPromptOverride != null && options.systemPromptOverride !== ""
      ? options.systemPromptOverride
      : getSystemPromptForPreset(options?.systemPromptPresetId ?? DEFAULT_SYSTEM_PROMPT_PRESET_ID);
  const modelName =
    options?.modelOverride != null && options.modelOverride !== ""
      ? options.modelOverride
      : config.model;

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
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

  return validateActionPlan(parseRobustJson(content));
}
