"use client";

import { useState, useEffect, useCallback } from "react";
import DropZone from "@/components/DropZone";
import ApiSelector from "@/components/ApiSelector";
import FileList from "@/components/FileList";
import ActionPlan from "@/components/ActionPlan";

import { MasterActionPlan } from "@/lib/ai-clients";

type Provider = "openai" | "perplexity" | "gemini" | "openrouter";

interface UploadedFile {
  name: string;
  size: number;
  content: string;
}

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [provider, setProvider] = useState<Provider>("openai");
  const [available, setAvailable] = useState<Provider[]>([]);
  const [plan, setPlan] = useState<MasterActionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => {
        setAvailable(data.providers);
        if (data.providers.length > 0 && !data.providers.includes(provider)) {
          setProvider(data.providers[0]);
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

    try {
      const markdown = files.map((f) => `# ${f.name}\n\n${f.content}`).join("\n\n---\n\n");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, provider }),
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
      <div className="max-w-3xl mx-auto px-4 py-12">
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
                  All providers are selectable. If an API key is not configured, you will receive an error.
                </p>
                <ApiSelector
                  selected={provider}
                  onSelect={setProvider}
                  available={available}
                />
              </div>

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
