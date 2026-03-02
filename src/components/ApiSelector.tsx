"use client";

type Provider = "openai" | "perplexity" | "gemini" | "openrouter";

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
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
              isSelected
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : isAvailable
                ? "border-gray-200 hover:border-gray-300 text-gray-700"
                : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
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
