import { NextRequest, NextResponse } from "next/server";
import {
  generateActionPlan,
  Provider,
  getAvailableProviders,
  getConfiguredProviders,
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
      userPromptOverride,
      systemPromptOverride,
      systemPromptPresetId,
      modelOverride,
    } = (await req.json()) as {
      markdown: string;
      provider: Provider;
      userPromptOverride?: string;
      systemPromptOverride?: string;
      systemPromptPresetId?: SystemPromptPresetId;
      modelOverride?: string;
    };

    if (!markdown || !provider) {
      return NextResponse.json(
        { error: "Missing markdown or provider" },
        { status: 400 }
      );
    }

    if (markdown.length > MAX_MARKDOWN_CHARS) {
      return NextResponse.json(
        {
          error: `Markdown too large (${markdown.length} chars). Maximum is ${formatCharLimit(MAX_MARKDOWN_CHARS)} characters.`,
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
      userPromptOverride:
        userPromptOverride != null && userPromptOverride !== ""
          ? userPromptOverride
          : undefined,
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
