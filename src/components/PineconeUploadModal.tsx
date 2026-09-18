"use client";

import { useEffect, useState } from "react";

interface UploadChunkInput {
  title?: string;
  section?: string;
  text: string;
  docType?: string;
  source?: string;
  tags?: string[];
}

interface PineconeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  chunks: UploadChunkInput[];
  defaultTitle?: string;
}

export default function PineconeUploadModal({
  isOpen,
  onClose,
  chunks,
  defaultTitle = "Book",
}: PineconeUploadModalProps) {
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState("");
  const [customNamespace, setCustomNamespace] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      fetch("/api/knowledge-namespaces")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.namespaces) && data.namespaces.length > 0) {
            setNamespaces(data.namespaces);
            setSelectedNamespace(data.namespaces[0]);
          } else {
            setSelectedNamespace("__custom__");
            setCustomNamespace("books");
          }
        })
        .catch(() => {
          setSelectedNamespace("__custom__");
          setCustomNamespace("books");
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetNamespace =
    selectedNamespace === "__custom__" ? customNamespace.trim() : selectedNamespace;

  const handleUpload = async () => {
    if (!targetNamespace) {
      setError("Please enter or select a target Pinecone namespace.");
      return;
    }
    if (chunks.length === 0) {
      setError("No chunks available to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/knowledge-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namespace: targetNamespace,
          chunks,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        count?: number;
        namespace?: string;
        index?: string;
        error?: string;
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to upload to Pinecone");
      }

      setSuccessMsg(
        `✅ Successfully embedded and uploaded ${data.count} chunks to Pinecone index "${data.index}" in namespace "${data.namespace}"!`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload to Pinecone");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🌲</span> Upload Chunks to Pinecone
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Embeds locally (multilingual-e5-large, 1024 dim) — 0 paid token cost!
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Info */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center justify-between font-medium">
            <span className="text-slate-400">Document / Book:</span>
            <span className="text-white font-semibold truncate max-w-[240px]">{defaultTitle}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Chunks to Vectorize:</span>
            <span className="text-amber-400 font-bold">{chunks.length} sections</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Embedding Model:</span>
            <span className="font-mono text-blue-300">Xenova/multilingual-e5-large (1024 dim)</span>
          </div>
        </div>

        {/* Namespace Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Target Pinecone Namespace
          </label>
          {namespaces.length > 0 ? (
            <select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  Namespace: {ns}
                </option>
              ))}
              <option value="__custom__">Create new namespace…</option>
            </select>
          ) : (
            <input
              type="text"
              value={customNamespace}
              onChange={(e) => setCustomNamespace(e.target.value)}
              placeholder="e.g. books, action-plans"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            />
          )}

          {selectedNamespace === "__custom__" && (
            <input
              type="text"
              value={customNamespace}
              onChange={(e) => setCustomNamespace(e.target.value)}
              placeholder="Enter new namespace name (e.g. books, notes)"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none mt-2"
            />
          )}
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-xl text-green-300 text-xs font-medium leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            {successMsg ? "Done" : "Cancel"}
          </button>
          {!successMsg && (
            <button
              onClick={handleUpload}
              disabled={uploading || !targetNamespace}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Embedding & Uploading…
                </>
              ) : (
                "🌲 Embed & Upload to Pinecone"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
