import { NextRequest, NextResponse } from "next/server";
import {
  generateActionPlan,
  Provider,
  getAvailableProviders,
  getConfiguredProviders,
  MasterActionPlan,
} from "@/lib/ai-clients";
import { requireApiSecret } from "@/lib/api-auth";
import { MAX_MARKDOWN_CHARS, formatCharLimit } from "@/lib/limits";
import type { SystemPromptPresetId } from "@/lib/prompt";

export async function POST(req: NextRequest) {
  const authError = requireApiSecret(req);
  if (authError) return authError;

  try {
    const {
      markdown,
      provider,
      previousPlan,
      feedback,
      systemPromptOverride,
      systemPromptPresetId,
      modelOverride,
    } = (await req.json()) as {
      markdown: string;
      provider: Provider;
      previousPlan: MasterActionPlan;
      feedback: string;
      systemPromptOverride?: string;
      systemPromptPresetId?: SystemPromptPresetId;
      modelOverride?: string;
    };

    if (!markdown || !provider || !previousPlan || !feedback) {
      return NextResponse.json(
        { error: "Missing markdown, provider, previousPlan, or feedback" },
        { status: 400 }
      );
    }

    if (markdown.length > MAX_MARKDOWN_CHARS) {
      return NextResponse.json(
        {
          error: `Markdown too large (${markdown.length} chars). This app's configured limit is ${formatCharLimit(MAX_MARKDOWN_CHARS)} characters — a cost/latency safety cap, not the AI model's actual context limit. Raise it via the MAX_MARKDOWN_CHARS env var if your provider/model can handle more.`,
        },
        { status: 413 }
      );
    }

    const knownProviders = getAvailableProviders();
    if (!knownProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Unknown provider "${provider}"` },
        { status: 400 }
      );
    }

    const configuredProviders = getConfiguredProviders();
    if (!configuredProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Provider "${provider}" is not configured` },
        { status: 400 }
      );
    }

    const result = await generateActionPlan(markdown, provider, {
      refineContext: { previousPlan, feedback },
      systemPromptOverride:
        systemPromptOverride != null && systemPromptOverride !== ""
          ? systemPromptOverride
          : undefined,
      systemPromptPresetId: systemPromptPresetId ?? undefined,
      modelOverride:
        modelOverride != null && modelOverride !== ""
          ? modelOverride
          : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
