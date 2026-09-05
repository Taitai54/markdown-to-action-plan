import { NextResponse } from "next/server";

interface OllamaModelTag {
  name: string;
  model?: string;
}

export async function GET() {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({
        models: [
          { id: "gpt-oss:20b", label: "GPT-OSS 20B (local)" },
          { id: "gpt-oss:120b", label: "GPT-OSS 120B (local)" },
          { id: "gemma4:latest", label: "Gemma 4 Latest (local)" },
        ],
      });
    }

    const data = (await res.json()) as { models?: OllamaModelTag[] };
    const models = (data.models ?? [])
      .map((m) => ({
        id: m.name || m.model || "",
        label: (m.name || m.model || "").replace(/:latest$/, ""),
      }))
      .filter((m) => m.id)
      .sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({ models: models.length > 0 ? models : [
      { id: "gpt-oss:20b", label: "GPT-OSS 20B (local)" },
      { id: "gemma4:latest", label: "Gemma 4 Latest (local)" },
    ] });
  } catch (err) {
    console.error("Ollama models fetch error:", err);
    return NextResponse.json({
      models: [
        { id: "gpt-oss:20b", label: "GPT-OSS 20B (local)" },
        { id: "gemma4:latest", label: "Gemma 4 Latest (local)" },
      ],
    });
  }
}
