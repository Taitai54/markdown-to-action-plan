"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import DropZone from "@/components/DropZone";
import ApiSelector from "@/components/ApiSelector";
import FileList from "@/components/FileList";
import ActionPlan from "@/components/ActionPlan";

import { MasterActionPlan, type Provider } from "@/lib/ai-clients";
import {
  buildUserPrompt,
  buildKbUserPrompt,
  getSystemPromptForPreset,
  DEFAULT_SYSTEM_PROMPT_PRESET_ID,
} from "@/lib/prompt";
import type { SystemPromptPresetId } from "@/lib/prompt";
import { concatenateMarkdown } from "@/lib/markdown-parser";
import { MAX_MARKDOWN_CHARS, formatCharLimit } from "@/lib/limits";

interface UploadedFile {
  name: string;
  size: number;
  content: string;
  lastModified?: number;
}

interface KbChunk {
  id: string;
  score: number;
  title: string;
  source: string;
  text: string;
  docType: string;
}

// Small curated fallback shown only if the live OpenRouter catalog fetch (below) fails —
// the real dropdown is populated from /api/openrouter-models so it never goes stale.
const OPENROUTER_MODELS_FALLBACK = [
  { id: "openai/gpt-4o-mini", label: "Balanced (GPT-4o mini)", hint: "Balanced quality and speed" },
  { id: "qwen/qwen-plus", label: "Qwen Plus (quality/cost)", hint: "Great quality-to-cost ratio" },
  { id: "meta-llama/llama-3.1-8b-instruct", label: "Llama 3.1 8B (low cost)", hint: "Low-cost general-purpose choice" },
  { id: "qwen/qwen-2.5-7b-instruct", label: "Qwen 2.5 7B (very low cost)", hint: "Very low cost, good for drafts" },
  { id: "mistralai/mistral-nemo", label: "Mistral Nemo (low cost)", hint: "Low-cost with strong instruction following" },
];

const OPENAI_MODELS = [
  { id: "gpt-5.5", label: "GPT-5.5 (best quality)", hint: "Latest flagship — best quality for complex plans" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini (lower cost)", hint: "Faster and cheaper than GPT-5.5" },
  { id: "gpt-4.1", label: "GPT-4.1", hint: "Previous generation flagship — still highly capable" },
  { id: "gpt-4o-mini", label: "GPT-4o mini (low cost)", hint: "Low cost and fast responses" },
];

const GEMINI_MODELS = [
  // "-latest" aliases: Google repoints these to the current release, so the picker
  // doesn't go stale as new Gemini generations ship.
  { id: "gemini-flash-latest", label: "Gemini Flash (recommended)", hint: "Always the current Gemini Flash — fast, capable, and cost-effective" },
  { id: "gemini-pro-latest", label: "Gemini Pro (best quality)", hint: "Always the current Gemini Pro — highest quality" },
  { id: "gemini-flash-lite-latest", label: "Gemini Flash Lite (low cost)", hint: "Always the current Gemini Flash Lite — lightest and cheapest option" },
];

const KB_PRESET_ID: SystemPromptPresetId = "knowledge-synthesis";

export default function Home() {
  // --- core state ---
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [provider, setProvider] = useState<Provider>("openai");
  const [available, setAvailable] = useState<Provider[]>([]);
  const [plan, setPlan] = useState<MasterActionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [promptExpanded] = useState(true);
  const [editablePrompt, setEditablePrompt] = useState("");
  const [userPromptDirty, setUserPromptDirty] = useState(false);
  const [masterPromptExpanded, setMasterPromptExpanded] = useState(false);
  const [systemPromptPresetId, setSystemPromptPresetId] = useState<SystemPromptPresetId>(DEFAULT_SYSTEM_PROMPT_PRESET_ID);
  const [editableSystemPrompt, setEditableSystemPrompt] = useState("");
  const [openRouterModels, setOpenRouterModels] = useState<{ id: string; label: string; hint?: string }[]>(
    OPENROUTER_MODELS_FALLBACK
  );
  const [openRouterModelPreset, setOpenRouterModelPreset] = useState(OPENROUTER_MODELS_FALLBACK[0].id);
  const [openRouterCustomModel, setOpenRouterCustomModel] = useState("");
  const [openAiModelPreset, setOpenAiModelPreset] = useState(OPENAI_MODELS[0].id);
  const [openAiCustomModel, setOpenAiCustomModel] = useState("");
  const [geminiModelPreset, setGeminiModelPreset] = useState(GEMINI_MODELS[0].id);
  const [geminiCustomModel, setGeminiCustomModel] = useState("");

  // YouTube ingestion
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  // KB mode
  const [inputMode, setInputMode] = useState<"files" | "kb">("files");
  const [kbQuery, setKbQuery] = useState("");
  const [kbNamespaceSelect, setKbNamespaceSelect] = useState("");
  const [kbCustomNamespace, setKbCustomNamespace] = useState("");
  const [kbTopK, setKbTopK] = useState(8);
  const [kbNamespaces, setKbNamespaces] = useState<string[]>([]);
  const [kbConfigured, setKbConfigured] = useState<boolean | null>(null);
  const [kbResults, setKbResults] = useState<string | null>(null);
  const [kbChunks, setKbChunks] = useState<KbChunk[]>([]);
  const [kbSearching, setKbSearching] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [kbPreviewExpanded, setKbPreviewExpanded] = useState(true);

  const kbNamespace = kbNamespaceSelect === "__custom__" ? kbCustomNamespace : kbNamespaceSelect;

  const selectedOpenAiModel = OPENAI_MODELS.find((m) => m.id === openAiModelPreset);
  const selectedGeminiModel = GEMINI_MODELS.find((m) => m.id === geminiModelPreset);
  const selectedOpenRouterModel = openRouterModels.find((m) => m.id === openRouterModelPreset);

  const concatenatedMarkdown = useMemo(() => concatenateMarkdown(files), [files]);
  const activeMarkdown = useMemo(
    () => (inputMode === "kb" ? (kbResults ?? "") : concatenatedMarkdown),
    [inputMode, kbResults, concatenatedMarkdown]
  );
  const defaultUserPrompt = useMemo(
    () =>
      inputMode === "kb" && kbResults
        ? buildKbUserPrompt(kbQuery, kbResults)
        : buildUserPrompt(activeMarkdown),
    [inputMode, kbResults, kbQuery, activeMarkdown]
  );
  const modelOverride = useMemo(() => {
    return provider === "openrouter"
      ? openRouterModelPreset === "custom" ? openRouterCustomModel : openRouterModelPreset
      : provider === "openai"
        ? openAiModelPreset === "custom" ? openAiCustomModel : openAiModelPreset
        : provider === "gemini"
          ? geminiModelPreset === "custom" ? geminiCustomModel : geminiModelPreset
          : undefined;
  }, [provider, openRouterModelPreset, openRouterCustomModel, openAiModelPreset, openAiCustomModel, geminiModelPreset, geminiCustomModel]);

  // sync user prompt when content changes
  useEffect(() => {
    const hasContent = inputMode === "files" ? files.length > 0 : kbResults !== null;
    if (hasContent && !userPromptDirty) {
      setEditablePrompt(defaultUserPrompt);
    }
  }, [defaultUserPrompt, files.length, userPromptDirty, inputMode, kbResults]); // eslint-disable-line react-hooks/exhaustive-deps

  // lazy-load system prompt text
  useEffect(() => {
    if (masterPromptExpanded && editableSystemPrompt === "") {
      setEditableSystemPrompt(getSystemPromptForPreset(systemPromptPresetId));
    }
  }, [masterPromptExpanded, systemPromptPresetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // fetch configured providers
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

  // fetch the live OpenRouter model catalog; keep the curated fallback list on failure
  useEffect(() => {
    fetch("/api/openrouter-models")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.models) && data.models.length > 0) {
          setOpenRouterModels(data.models as { id: string; label: string; hint?: string }[]);
        }
      })
      .catch(() => {
        // keep OPENROUTER_MODELS_FALLBACK
      });
  }, []);

  // fetch Pinecone namespaces
  useEffect(() => {
    fetch("/api/knowledge-namespaces")
      .then((r) => r.json())
      .then((data) => {
        if (data.error?.includes("PINECONE_API_KEY") || !Array.isArray(data.namespaces)) {
          setKbConfigured(false);
        } else {
          setKbConfigured(true);
          setKbNamespaces(data.namespaces as string[]);
          if ((data.namespaces as string[]).length > 0) {
            setKbNamespaceSelect((data.namespaces as string[])[0]);
          }
        }
      })
      .catch(() => setKbConfigured(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- handlers ---
  const handleFilesAdded = useCallback((newFiles: UploadedFile[]) => {
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const unique = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...unique];
    });
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProviderSwitch = (next: Provider) => {
    if (next === provider) return;
    setProvider(next);
    setError(null);
    setRefineError(null);
  };

  const handleModeSwitch = (mode: "files" | "kb") => {
    if (mode === inputMode) return;
    setInputMode(mode);
    setUserPromptDirty(false);
    setPlan(null);
    setError(null);
    const nextPreset = mode === "kb" ? KB_PRESET_ID : DEFAULT_SYSTEM_PROMPT_PRESET_ID;
    setSystemPromptPresetId(nextPreset);
    setEditableSystemPrompt(getSystemPromptForPreset(nextPreset));
  };

  const handleKbSearch = async () => {
    if (!kbQuery.trim() || !kbNamespace.trim()) return;
    setKbSearching(true);
    setKbError(null);
    setKbResults(null);
    setKbChunks([]);
    setUserPromptDirty(false);
    try {
      const res = await fetch("/api/knowledge-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: kbQuery.trim(), namespace: kbNamespace.trim(), topK: kbTopK }),
      });
      const data = await res.json() as { markdown?: string; chunks?: KbChunk[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setKbResults(data.markdown ?? "");
      setKbChunks(data.chunks ?? []);
      setKbPreviewExpanded(true);
    } catch (err) {
      setKbError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setKbSearching(false);
    }
  };

  const handleYoutubeImport = async () => {
    if (!youtubeUrl.trim()) return;
    setYoutubeLoading(true);
    setYoutubeError(null);
    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });
      const data = await res.json() as { title?: string; transcript?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch transcript");
      handleFilesAdded([
        {
          name: `YouTube: ${data.title ?? "Video"}`,
          size: (data.transcript ?? "").length,
          content: data.transcript ?? "",
        },
      ]);
      setYoutubeUrl("");
    } catch (err) {
      setYoutubeError(err instanceof Error ? err.message : "Failed to fetch transcript");
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (inputMode === "files" && files.length === 0) return;
    if (inputMode === "kb" && !kbResults) return;

    if (activeMarkdown.length > MAX_MARKDOWN_CHARS) {
      setError(
        `Content is too large (${activeMarkdown.length} chars). This app's configured limit is ${formatCharLimit(MAX_MARKDOWN_CHARS)} characters — a cost/latency safety cap, not the AI model's actual context limit. Raise it via the MAX_MARKDOWN_CHARS env var if your provider/model can handle more.`
      );
      return;
    }

    setLoading(true);
    setError(null);
    setPlan(null);
    setRefineError(null);
    setRefineFeedback("");

    const isCustomSystemPrompt =
      editableSystemPrompt !== "" &&
      editableSystemPrompt !== getSystemPromptForPreset(systemPromptPresetId);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: activeMarkdown,
          provider,
          ...(promptExpanded ? { userPromptOverride: editablePrompt } : {}),
          ...(isCustomSystemPrompt
            ? { systemPromptOverride: editableSystemPrompt }
            : { systemPromptPresetId }),
          ...(modelOverride != null && modelOverride !== "" ? { modelOverride } : {}),
        }),
      });

      const data = await res.json() as MasterActionPlan & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate");
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!plan || !refineFeedback.trim()) return;
    if (!activeMarkdown) {
      setRefineError(
        "The source content is no longer available. Re-add your files or re-run the knowledge base search before refining."
      );
      return;
    }
    setRefining(true);
    setRefineError(null);
    setError(null);

    const isCustomSystemPrompt =
      editableSystemPrompt !== "" &&
      editableSystemPrompt !== getSystemPromptForPreset(systemPromptPresetId);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: activeMarkdown,
          provider,
          previousPlan: plan,
          feedback: refineFeedback.trim(),
          ...(isCustomSystemPrompt
            ? { systemPromptOverride: editableSystemPrompt }
            : { systemPromptPresetId }),
          ...(modelOverride != null && modelOverride !== "" ? { modelOverride } : {}),
        }),
      });

      const data = await res.json() as MasterActionPlan & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to refine");
      setPlan(data);
      setRefineFeedback("");
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRefining(false);
    }
  };

  // Shared style tokens
  const inputCls = "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";
  const selectCls = "w-full rounded border border-slate-600 px-2 py-2 text-sm text-slate-100 bg-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";
  const cardCls = "space-y-2 rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-md p-4";

  const showControls = files.length > 0 || inputMode === "kb";
  const canGenerate = inputMode === "files" ? files.length > 0 : kbResults !== null;

  return (
    <main className="min-h-screen bg-slate-900">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8 lg:py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Markdown to Action Plan
          </h1>
          <p className="text-slate-400 mt-1">
            Upload files or query your knowledge base — AI turns your content into a structured, executable plan
          </p>
        </div>

        <div className="space-y-6">

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-slate-700 bg-slate-800/40 p-1 gap-1">
            <button
              onClick={() => handleModeSwitch("files")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                inputMode === "files"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Upload Files
            </button>
            <button
              onClick={() => handleModeSwitch("kb")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                inputMode === "kb"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Query Knowledge Base
            </button>
          </div>

          {/* FILES MODE */}
          {inputMode === "files" && (
            <>
              <DropZone onFilesAdded={handleFilesAdded} />

              {/* YouTube ingestion */}
              <div className={cardCls}>
                <label className="block text-sm font-medium text-slate-200">
                  Import YouTube transcript
                </label>
                <p className="text-xs text-slate-500">
                  Paste a YouTube URL to fetch the video transcript as a source document.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => { setYoutubeUrl(e.target.value); setYoutubeError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleYoutubeImport(); }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={inputCls + " flex-1"}
                  />
                  <button
                    onClick={handleYoutubeImport}
                    disabled={youtubeLoading || !youtubeUrl.trim()}
                    className="shrink-0 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/20 flex items-center gap-2"
                  >
                    {youtubeLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Fetching…
                      </>
                    ) : "Import"}
                  </button>
                </div>
                {youtubeError && <p className="text-xs text-red-400">{youtubeError}</p>}
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-slate-300">
                      Uploaded Files ({files.length})
                    </h2>
                    <button
                      onClick={() => { setFiles([]); setPlan(null); setUserPromptDirty(false); }}
                      className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <FileList files={files} onRemove={handleRemoveFile} />
                </div>
              )}
            </>
          )}

          {/* KB MODE */}
          {inputMode === "kb" && (
            <div className="space-y-4 rounded-xl border border-violet-500/30 bg-violet-500/5 backdrop-blur-md p-4">

              {kbConfigured === false && (
                <div className="rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2.5 text-xs text-amber-300">
                  <span className="font-medium">PINECONE_API_KEY not set.</span>{" "}
                  Add <code className="font-mono bg-amber-900/40 px-1 rounded">PINECONE_API_KEY</code> and{" "}
                  <code className="font-mono bg-amber-900/40 px-1 rounded">PINECONE_INDEX</code> to{" "}
                  <code className="font-mono bg-amber-900/40 px-1 rounded">.env.local</code> to enable knowledge base search.
                </div>
              )}

              {/* Query input */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Knowledge base search query
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  What topic or goal do you want to search for? This is sent to Pinecone to find the most relevant content — not sent to the AI yet.
                </p>
                <textarea
                  value={kbQuery}
                  onChange={(e) => setKbQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleKbSearch();
                  }}
                  rows={3}
                  placeholder={`e.g. "Build a marketing strategy for a B2B SaaS product" or "Set up automated email workflows"`}
                  className={inputCls}
                />
              </div>

              {/* Namespace + topK + Search */}
              <div className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-slate-400 mb-1">Namespace (collection within the index)</label>
                  {kbNamespaces.length > 0 ? (
                    <select
                      value={kbNamespaceSelect}
                      onChange={(e) => setKbNamespaceSelect(e.target.value)}
                      className={selectCls}
                    >
                      {kbNamespaces.map((ns) => (
                        <option key={ns} value={ns}>{ns}</option>
                      ))}
                      <option value="__custom__">Custom namespace…</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={kbCustomNamespace}
                      onChange={(e) => setKbCustomNamespace(e.target.value)}
                      placeholder="e.g. books, advisory-marketing"
                      className={inputCls}
                    />
                  )}
                  {kbNamespaceSelect === "__custom__" && (
                    <input
                      type="text"
                      value={kbCustomNamespace}
                      onChange={(e) => setKbCustomNamespace(e.target.value)}
                      placeholder="Enter namespace"
                      className={inputCls + " mt-1.5"}
                    />
                  )}
                </div>
                <div className="w-36">
                  <label className="block text-xs text-slate-400 mb-1">Results (top-K)</label>
                  <select
                    value={kbTopK}
                    onChange={(e) => setKbTopK(Number(e.target.value))}
                    className={selectCls}
                  >
                    <option value={5}>5 chunks</option>
                    <option value={8}>8 chunks (default)</option>
                    <option value={12}>12 chunks</option>
                    <option value={16}>16 chunks</option>
                  </select>
                </div>
                <button
                  onClick={handleKbSearch}
                  disabled={
                    kbSearching ||
                    !kbQuery.trim() ||
                    !kbNamespace.trim() ||
                    kbNamespaceSelect === "__custom__" && !kbCustomNamespace.trim()
                  }
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/20 flex items-center gap-2 whitespace-nowrap"
                >
                  {kbSearching ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Searching…
                    </>
                  ) : "Search"}
                </button>
              </div>

              {kbError && <p className="text-xs text-red-400">{kbError}</p>}

              {/* Results preview */}
              {kbChunks.length > 0 && (
                <div className="border-t border-violet-500/20 pt-3">
                  <button
                    type="button"
                    onClick={() => setKbPreviewExpanded(!kbPreviewExpanded)}
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-white font-medium transition-colors w-full text-left"
                  >
                    <span
                      className="text-xs transition-transform duration-200 inline-block"
                      style={{ transform: kbPreviewExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                    >
                      ▶
                    </span>
                    <span>{kbChunks.length} chunks retrieved</span>
                    <span className="text-xs text-slate-500 font-normal ml-auto">
                      {kbPreviewExpanded ? "Collapse" : "Expand"} preview
                    </span>
                  </button>

                  {kbPreviewExpanded && (
                    <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                      {kbChunks.map((chunk) => {
                        const scoreColor =
                          chunk.score >= 0.8
                            ? "bg-emerald-900/40 text-emerald-300"
                            : chunk.score >= 0.6
                              ? "bg-amber-900/40 text-amber-300"
                              : "bg-slate-700/60 text-slate-400";
                        return (
                          <div
                            key={chunk.id}
                            className="rounded-lg border border-slate-700/40 bg-slate-800/50 px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-xs font-medium text-slate-200 truncate max-w-[220px]">
                                {chunk.title || chunk.source || "Untitled"}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ${scoreColor}`}>
                                {chunk.score.toFixed(3)}
                              </span>
                              {chunk.docType && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 shrink-0">
                                  {chunk.docType}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {chunk.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SHARED CONTROLS — shown once files are uploaded (file mode) or always in KB mode */}
          {showControls && (
            <>
              {/* AI Provider */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  AI Provider
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Only configured providers are selectable.
                </p>
                <ApiSelector
                  selected={provider}
                  onSelect={handleProviderSwitch}
                  available={available}
                />
              </div>

              {/* OpenRouter model */}
              {provider === "openrouter" && (
                <div className={cardCls}>
                  <label className="block text-sm font-medium text-slate-200">OpenRouter model</label>
                  <p className="text-xs text-slate-500">
                    Choose from OpenRouter&apos;s full live model catalog or set a custom model id.
                  </p>
                  <select
                    value={openRouterModelPreset}
                    onChange={(e) => setOpenRouterModelPreset(e.target.value)}
                    className={selectCls}
                  >
                    {openRouterModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                    <option value="custom">Custom model id…</option>
                  </select>
                  {openRouterModelPreset === "custom" && (
                    <input
                      type="text"
                      value={openRouterCustomModel}
                      onChange={(e) => setOpenRouterCustomModel(e.target.value)}
                      placeholder="e.g. qwen/qwen-plus"
                      className={inputCls}
                    />
                  )}
                  {openRouterModelPreset !== "custom" && selectedOpenRouterModel?.hint && (
                    <p className="text-xs text-slate-500">{selectedOpenRouterModel.hint}</p>
                  )}
                </div>
              )}

              {/* OpenAI model */}
              {provider === "openai" && (
                <div className={cardCls}>
                  <label className="block text-sm font-medium text-slate-200">OpenAI model</label>
                  <p className="text-xs text-slate-500">Choose a preset or enter any OpenAI model ID.</p>
                  <select
                    value={openAiModelPreset}
                    onChange={(e) => setOpenAiModelPreset(e.target.value)}
                    className={selectCls}
                  >
                    {OPENAI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                    <option value="custom">Custom model id…</option>
                  </select>
                  {openAiModelPreset === "custom" && (
                    <input
                      type="text"
                      value={openAiCustomModel}
                      onChange={(e) => setOpenAiCustomModel(e.target.value)}
                      placeholder="e.g. gpt-4.1, o3-mini"
                      className={inputCls}
                    />
                  )}
                  {openAiModelPreset !== "custom" && selectedOpenAiModel?.hint && (
                    <p className="text-xs text-slate-500">{selectedOpenAiModel.hint}</p>
                  )}
                </div>
              )}

              {/* Gemini model */}
              {provider === "gemini" && (
                <div className={cardCls}>
                  <label className="block text-sm font-medium text-slate-200">Gemini model</label>
                  <p className="text-xs text-slate-500">Choose a preset or enter any Gemini model ID.</p>
                  <select
                    value={geminiModelPreset}
                    onChange={(e) => setGeminiModelPreset(e.target.value)}
                    className={selectCls}
                  >
                    {GEMINI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                    <option value="custom">Custom model id…</option>
                  </select>
                  {geminiModelPreset === "custom" && (
                    <input
                      type="text"
                      value={geminiCustomModel}
                      onChange={(e) => setGeminiCustomModel(e.target.value)}
                      placeholder="e.g. gemini-2.5-pro, gemini-exp-1206"
                      className={inputCls}
                    />
                  )}
                  {geminiModelPreset !== "custom" && selectedGeminiModel?.hint && (
                    <p className="text-xs text-slate-500">{selectedGeminiModel.hint}</p>
                  )}
                </div>
              )}

              {/* Master prompt (system) */}
              {masterPromptExpanded ? (
                <div className={`${cardCls} space-y-3`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <label className="text-sm font-medium text-slate-200 block">
                        Master prompt (system)
                      </label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Rules that define the action-plan format and style.
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
                        className="rounded border border-slate-600 px-2 py-1.5 text-sm text-slate-100 bg-slate-900"
                      >
                        <option value="granular-builder">Granular builder (default)</option>
                        <option value="strict-playbook">Strict playbook</option>
                        <option value="summary">Summary / high-level</option>
                        <option value="research-oriented">Research-oriented</option>
                        <option value="minimal">Minimal</option>
                        <option value="knowledge-synthesis">Knowledge synthesis</option>
                        <option value="custom">Custom</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setEditableSystemPrompt(getSystemPromptForPreset(systemPromptPresetId))}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      >
                        Reset to preset
                      </button>
                      <button
                        type="button"
                        onClick={() => setMasterPromptExpanded(false)}
                        className="text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors"
                      >
                        Collapse
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={editableSystemPrompt}
                    onChange={(e) => setEditableSystemPrompt(e.target.value)}
                    rows={12}
                    className={inputCls + " font-mono"}
                    placeholder="System prompt (master rules)…"
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
                    className="text-sm text-slate-400 hover:text-slate-200 underline transition-colors"
                  >
                    Master prompt (system)
                  </button>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Rules that define the action-plan format and style. Optional; a default is used if you don&apos;t change this.
                  </p>
                </div>
              )}

              {/* User prompt */}
              {promptExpanded && (
                <div className="space-y-3 rounded-xl border-2 border-blue-500/40 bg-blue-500/5 backdrop-blur-md p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-200">
                      Customize user prompt
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditablePrompt(defaultUserPrompt);
                        setUserPromptDirty(false);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Reset to default
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {inputMode === "kb"
                      ? "This is the instruction sent to the AI — it includes the retrieved knowledge chunks automatically. Edit it to focus or refine the output."
                      : "This box is always visible so you can quickly customize the user prompt. It is sent together with the selected master system prompt."}
                  </p>
                  <textarea
                    value={editablePrompt}
                    onChange={(e) => {
                      setEditablePrompt(e.target.value);
                      setUserPromptDirty(true);
                    }}
                    rows={14}
                    className={inputCls + " font-mono"}
                    placeholder="Instruction and content sent to the AI…"
                  />
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={loading || refining || available.length === 0 || !canGenerate}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.01] hover:shadow-xl hover:shadow-blue-500/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating…
                  </span>
                ) : inputMode === "kb" && !kbResults ? (
                  "Search first to retrieve knowledge"
                ) : (
                  "Generate Action Plan"
                )}
              </button>
            </>
          )}

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <ActionPlan plan={plan} />

          {plan && (
            <div className={cardCls}>
              <label className="block text-sm font-medium text-slate-200">
                Ask for improvements
              </label>
              <p className="text-xs text-slate-500">
                Tell the AI what&apos;s wrong or too generic — it revises the plan, leaving everything else untouched.
              </p>
              <textarea
                value={refineFeedback}
                onChange={(e) => setRefineFeedback(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="e.g. Milestone 3 is too generic — give me a real example with exact commands."
              />
              <button
                onClick={handleRefine}
                disabled={refining || loading || !refineFeedback.trim()}
                className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200"
              >
                {refining ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Improving…
                  </span>
                ) : "Improve this plan"}
              </button>
              {refineError && (
                <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-red-400 text-sm">
                  {refineError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
