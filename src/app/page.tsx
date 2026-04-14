"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import DropZone from "@/components/DropZone";
import ApiSelector from "@/components/ApiSelector";
import FileList from "@/components/FileList";
import ActionPlan from "@/components/ActionPlan";

import { MasterActionPlan } from "@/lib/ai-clients";
import {
  buildUserPrompt,
  getSystemPromptForPreset,
  DEFAULT_SYSTEM_PROMPT_PRESET_ID,
} from "@/lib/prompt";
import type { SystemPromptPresetId } from "@/lib/prompt";
import { concatenateMarkdown } from "@/lib/markdown-parser";

type Provider = "openai" | "perplexity" | "gemini" | "openrouter";

interface UploadedFile {
  name: string;
  size: number;
  content: string;
  lastModified?: number;
}

const OPENROUTER_MODELS = [
  { id: "openai/gpt-4o-mini", label: "Balanced (GPT-4o mini)", hint: "Balanced quality and speed" },
  { id: "qwen/qwen-plus", label: "Qwen Plus (quality/cost)", hint: "Great quality-to-cost ratio" },
  { id: "meta-llama/llama-3.1-8b-instruct", label: "Llama 3.1 8B (low cost)", hint: "Low-cost general-purpose choice" },
  { id: "qwen/qwen2.5-7b-instruct", label: "Qwen 2.5 7B (very low cost)", hint: "Very low cost, good for drafts" },
  { id: "mistralai/mistral-nemo", label: "Mistral Nemo (low cost)", hint: "Low-cost with strong instruction following" },
];

const OPENAI_MODELS = [
  { id: "gpt-4o", label: "GPT-4o (best quality)", hint: "Best quality for complex plans" },
  { id: "gpt-4o-mini", label: "GPT-4o mini (lower cost)", hint: "Lower cost and faster responses" },
];

const GEMINI_MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (balanced)", hint: "Balanced quality and speed" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite (lower cost)", hint: "Lower cost for iterative drafting" },
];

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [provider, setProvider] = useState<Provider>("openai");
  const [available, setAvailable] = useState<Provider[]>([]);
  const [plan, setPlan] = useState<MasterActionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptExpanded] = useState(true);
  const [editablePrompt, setEditablePrompt] = useState("");
  const [userPromptDirty, setUserPromptDirty] = useState(false);
  const [masterPromptExpanded, setMasterPromptExpanded] = useState(false);
  const [systemPromptPresetId, setSystemPromptPresetId] = useState<SystemPromptPresetId>(DEFAULT_SYSTEM_PROMPT_PRESET_ID);
  const [editableSystemPrompt, setEditableSystemPrompt] = useState("");
  const [openRouterModelPreset, setOpenRouterModelPreset] = useState(OPENROUTER_MODELS[0].id);
  const [openRouterCustomModel, setOpenRouterCustomModel] = useState("");
  const [openAiModelPreset, setOpenAiModelPreset] = useState(OPENAI_MODELS[0].id);
  const [geminiModelPreset, setGeminiModelPreset] = useState(GEMINI_MODELS[0].id);
  const selectedOpenAiModel = OPENAI_MODELS.find((m) => m.id === openAiModelPreset);
  const selectedGeminiModel = GEMINI_MODELS.find((m) => m.id === geminiModelPreset);
  const selectedOpenRouterModel = OPENROUTER_MODELS.find((m) => m.id === openRouterModelPreset);

  const concatenatedMarkdown = useMemo(
    () => concatenateMarkdown(files),
    [files]
  );
  const defaultUserPrompt = useMemo(
    () => buildUserPrompt(concatenatedMarkdown),
    [concatenatedMarkdown]
  );

  useEffect(() => {
    if (files.length > 0 && !userPromptDirty) {
      setEditablePrompt(defaultUserPrompt);
    }
  }, [defaultUserPrompt, files.length, userPromptDirty]);

  useEffect(() => {
    if (masterPromptExpanded && editableSystemPrompt === "") {
      setEditableSystemPrompt(getSystemPromptForPreset(systemPromptPresetId));
    }
  }, [masterPromptExpanded, systemPromptPresetId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => {
        const configured = (data.providers ?? []) as Provider[];
        setAvailable(configured);
        if (configured.length > 0 && !configured.includes(provider)) {
          setProvider(configured[0]);
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilesAdded = useCallback(
    (newFiles: UploadedFile[]) => {
      setFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const unique = newFiles.filter((f) => !existingNames.has(f.name));
        return [...prev, ...unique];
      });
    },
    []
  );

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleGenerate = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setPlan(null);

    const isCustomSystemPrompt =
      editableSystemPrompt !== "" &&
      editableSystemPrompt !== getSystemPromptForPreset(systemPromptPresetId);
    const modelOverride =
      provider === "openrouter"
        ? openRouterModelPreset === "custom"
          ? openRouterCustomModel
          : openRouterModelPreset
        : provider === "openai"
          ? openAiModelPreset
          : provider === "gemini"
            ? geminiModelPreset
            : undefined;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: concatenatedMarkdown,
          provider,
          ...(promptExpanded ? { userPromptOverride: editablePrompt } : {}),
          ...(isCustomSystemPrompt
            ? { systemPromptOverride: editableSystemPrompt }
            : { systemPromptPresetId: systemPromptPresetId }),
          ...(modelOverride != null && modelOverride !== "" ? { modelOverride } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8 lg:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Markdown to Action Plan
          </h1>
          <p className="text-gray-500 mt-1">
            Drop your markdown files and let AI create a structured action plan
          </p>
        </div>

        <div className="space-y-6">
          <DropZone onFilesAdded={handleFilesAdded} />
          
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-700">Uploaded Files ({files.length})</h2>
                <button
                  onClick={() => {
                    setFiles([]);
                    setPlan(null);
                    setUserPromptDirty(false);
                  }}

                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              </div>
              <FileList files={files} onRemove={handleRemoveFile} />
            </div>
          )}

          {files.length > 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Provider
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Only configured providers are selectable.
                </p>
                <ApiSelector
                  selected={provider}
                  onSelect={setProvider}
                  available={available}
                />
              </div>

              {provider === "openrouter" && (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <label className="block text-sm font-medium text-gray-700">
                    OpenRouter model
                  </label>
                  <p className="text-xs text-gray-500">
                    Choose a low-cost model preset or set a custom OpenRouter model id.
                  </p>
                  <select
                    value={openRouterModelPreset}
                    onChange={(e) => setOpenRouterModelPreset(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-2 text-sm text-gray-700 bg-white"
                  >
                    {OPENROUTER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                    <option value="custom">Custom model id...</option>
                  </select>
                  {openRouterModelPreset === "custom" && (
                    <input
                      type="text"
                      value={openRouterCustomModel}
                      onChange={(e) => setOpenRouterCustomModel(e.target.value)}
                      placeholder="e.g. qwen/qwen-plus"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                  {openRouterModelPreset !== "custom" && selectedOpenRouterModel?.hint && (
                    <p className="text-xs text-gray-500">{selectedOpenRouterModel.hint}</p>
                  )}
                </div>
              )}

              {provider === "openai" && (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <label className="block text-sm font-medium text-gray-700">
                    OpenAI model
                  </label>
                  <p className="text-xs text-gray-500">
                    Choose a quality or lower-cost OpenAI model.
                  </p>
                  <select
                    value={openAiModelPreset}
                    onChange={(e) => setOpenAiModelPreset(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-2 text-sm text-gray-700 bg-white"
                  >
                    {OPENAI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {selectedOpenAiModel?.hint && (
                    <p className="text-xs text-gray-500">{selectedOpenAiModel.hint}</p>
                  )}
                </div>
              )}

              {provider === "gemini" && (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Gemini model
                  </label>
                  <p className="text-xs text-gray-500">
                    Choose a balanced or lower-cost Gemini model.
                  </p>
                  <select
                    value={geminiModelPreset}
                    onChange={(e) => setGeminiModelPreset(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-2 text-sm text-gray-700 bg-white"
                  >
                    {GEMINI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {selectedGeminiModel?.hint && (
                    <p className="text-xs text-gray-500">{selectedGeminiModel.hint}</p>
                  )}
                </div>
              )}

              {masterPromptExpanded ? (
                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block">
                        Master prompt (system)
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Rules that define the action-plan format and style. Optional; a default is used if you don&apos;t change this.
                      </p>
                    </div>
                    <div className="flex gap-2 items-center flex-shrink-0">
                      <select
                        value={
                          editableSystemPrompt !== "" &&
                          editableSystemPrompt !== getSystemPromptForPreset(systemPromptPresetId)
                            ? "custom"
                            : systemPromptPresetId
                        }
                        onChange={(e) => {
                          const v = e.target.value as SystemPromptPresetId | "custom";
                          if (v === "custom") return;
                          setSystemPromptPresetId(v);
                          setEditableSystemPrompt(getSystemPromptForPreset(v));
                        }}
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-700 bg-white"
                      >
                        <option value="strict-playbook">Strict playbook</option>
                        <option value="summary">Summary / high-level</option>
                        <option value="research-oriented">Research-oriented</option>
                        <option value="minimal">Minimal</option>
                        <option value="custom">Custom</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setEditableSystemPrompt(getSystemPromptForPreset(systemPromptPresetId))
                        }
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Reset to preset
                      </button>
                      <button
                        type="button"
                        onClick={() => setMasterPromptExpanded(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Collapse
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={editableSystemPrompt}
                    onChange={(e) => setEditableSystemPrompt(e.target.value)}
                    rows={12}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="System prompt (master rules)..."
                  />
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setMasterPromptExpanded(true);
                      if (editableSystemPrompt === "") {
                        setEditableSystemPrompt(getSystemPromptForPreset(systemPromptPresetId));
                      }
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Master prompt (system)
                  </button>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Rules that define the action-plan format and style. Optional; a default is used if you don&apos;t change this.
                  </p>
                </div>
              )}

              {promptExpanded && (
                <div className="space-y-3 rounded-lg border-2 border-blue-300 bg-blue-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Customize user prompt (large editor)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditablePrompt(defaultUserPrompt);
                          setUserPromptDirty(false);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Reset to default
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    This box is always visible so you can quickly customize the user prompt. It is sent together with the selected master system prompt.
                  </p>
                  <textarea
                    value={editablePrompt}
                    onChange={(e) => {
                      setEditablePrompt(e.target.value);
                      setUserPromptDirty(true);
                    }}
                    rows={14}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Instruction and markdown sent to the AI..."
                  />
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading || available.length === 0}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  "Generate Action Plan"
                )}
              </button>
            </>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <ActionPlan plan={plan} />
        </div>
      </div>
    </main>
  );
}
