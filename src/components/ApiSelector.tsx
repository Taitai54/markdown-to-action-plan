"use client";

import type { Provider } from "@/lib/ai-clients";

interface ApiSelectorProps {
  selected: Provider;
  onSelect: (provider: Provider) => void;
  available: Provider[];
}

const PROVIDERS: { id: Provider; label: string; icon: string }[] = [
  { id: "openai", label: "ChatGPT", icon: "🤖" },
  { id: "perplexity", label: "Perplexity", icon: "🔍" },
  { id: "gemini", label: "Gemini", icon: "✨" },
  { id: "openrouter", label: "OpenRouter", icon: "🌐" },
];

export default function ApiSelector({
  selected,
  onSelect,
  available,
}: ApiSelectorProps) {
  return (
    <div className="flex gap-3">
      {PROVIDERS.map((provider) => {
        const isAvailable = available.includes(provider.id);
        const isSelected = selected === provider.id;

        return (
          <button
            key={provider.id}
            onClick={() => isAvailable && onSelect(provider.id)}
            disabled={!isAvailable}
            title={!isAvailable ? `${provider.label} API key not configured` : ""}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
              isSelected
                ? "border-blue-500 bg-blue-500/15 text-blue-300 shadow-sm shadow-blue-500/20"
                : isAvailable
                ? "border-slate-600 hover:border-slate-400 text-slate-200 hover:bg-slate-700/40"
                : "border-slate-700 bg-slate-800/20 text-slate-600 cursor-not-allowed"
            }`}
          >
            <span className="text-xl">{provider.icon}</span>
            <span className="font-medium">{provider.label}</span>
          </button>
        );
      })}
    </div>
  );
}
