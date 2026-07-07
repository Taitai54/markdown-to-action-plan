"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useMemo, useEffect } from "react";
import { marked } from "marked";
import { saveAs } from "file-saver";
import { MasterActionPlan, Milestone } from "@/lib/ai-clients";
import { escapeHtml } from "@/lib/escape-html";
import type { Components } from "react-markdown";

interface ActionPlanProps {
  plan: MasterActionPlan | null;
}

function sanitizeFilename(title: string): string {
  const base = title.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "master-action-plan";
  return base;
}

function ensureExtension(name: string, ext: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(ext)) return name;
  return name.trim() ? `${name.trim()}${ext.startsWith(".") ? ext : `.${ext}`}` : `master-action-plan${ext.startsWith(".") ? ext : `.${ext}`}`;
}

const supportsSavePicker = typeof window !== "undefined" && "showSaveFilePicker" in window;

const PRIORITY_STYLES = {
  high: "bg-red-500/20 text-red-400 border border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border border-green-500/30",
};

function milestoneStorageKey(planTitle: string): string {
  return `map-milestones:${sanitizeFilename(planTitle)}`;
}

function loadMilestoneDone(planTitle: string): Record<number, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(milestoneStorageKey(planTitle));
    return raw ? (JSON.parse(raw) as Record<number, boolean>) : {};
  } catch {
    return {};
  }
}

/** Inline copy button used inside code blocks */
function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: no-op
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 rounded text-[11px] font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600 transition-all duration-150"
      title="Copy code"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/** Custom code block renderer with Copy Code button */
const markdownComponents: Components = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code({ className, children, ...props }: any) {
    const isBlock = className?.startsWith("language-") || String(children).includes("\n");
    const codeString = String(children).replace(/\n$/, "");
    if (!isBlock) {
      return (
        <code
          className="bg-slate-700/60 text-blue-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    const lang = className?.replace("language-", "") ?? "";
    return (
      <div className="relative group my-4">
        {lang && (
          <span className="absolute top-2 left-3 text-[10px] uppercase tracking-widest text-slate-500 font-mono select-none">
            {lang}
          </span>
        )}
        <CopyCodeButton code={codeString} />
        <pre className={`overflow-x-auto rounded-xl bg-slate-900 border border-slate-700/60 px-4 pb-4 ${lang ? "pt-7" : "pt-4"} text-sm`}>
          <code className="text-slate-200 font-mono">{children}</code>
        </pre>
      </div>
    );
  },
};

function MilestoneCard({
  milestone,
  done,
  onToggle,
}: {
  milestone: Milestone;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${
        done
          ? "bg-slate-800/40 opacity-60 border-slate-700/40"
          : "bg-slate-800/60 border-slate-700/60 backdrop-blur-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded border-slate-600 accent-blue-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {milestone.category}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${PRIORITY_STYLES[milestone.priority]}`}
            >
              {milestone.priority}
            </span>
          </div>
          <h3
            className={`text-sm font-medium ${
              done ? "line-through text-slate-500" : "text-slate-100"
            }`}
          >
            {milestone.title}
          </h3>
          <p className="text-[12px] text-slate-400 mt-2">
            <strong className="text-slate-300">Done when:</strong> {milestone.done_when}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ActionPlan({ plan }: ActionPlanProps) {
  const [copying, setCopying] = useState(false);
  const [exporting, setExporting] = useState(false);

  const defaultDownloadName = useMemo(
    () => (plan ? sanitizeFilename(plan.title) : "master-action-plan"),
    [plan]
  );
  const [downloadFilename, setDownloadFilename] = useState(defaultDownloadName);
  const [milestoneDone, setMilestoneDone] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (plan) setDownloadFilename(defaultDownloadName);
  }, [plan, defaultDownloadName]);

  useEffect(() => {
    if (plan) setMilestoneDone(loadMilestoneDone(plan.title));
  }, [plan?.title]);

  const toggleMilestone = (index: number) => {
    if (!plan) return;
    setMilestoneDone((prev) => {
      const next = { ...prev, [index]: !prev[index] };
      try {
        localStorage.setItem(milestoneStorageKey(plan.title), JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  };

  if (!plan) return null;

  const currentDownloadName = downloadFilename || defaultDownloadName;
  const safeMilestones = Array.isArray(plan.milestones) ? plan.milestones : [];

  const saveBlobWithPicker = async (
    blob: Blob,
    suggestedName: string,
    _mimeType: string,
    extension: string
  ) => {
    if (supportsSavePicker) {
      try {
        const w = window as unknown as {
          showSaveFilePicker: (o: {
            suggestedName: string;
            types?: { description: string; accept: Record<string, string[]> }[];
          }) => Promise<{
            createWritable: () => Promise<{
              write: (data: Blob) => Promise<void>;
              close: () => Promise<void>;
            }>;
          }>;
        };
        const handle = await w.showSaveFilePicker({
          suggestedName,
          types:
            extension === ".md"
              ? [{ description: "Markdown", accept: { "text/markdown": [".md"] } }]
              : [{ description: "Word document", accept: { "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
      }
    }
    saveAs(blob, suggestedName);
  };

  const downloadMarkdown = async () => {
    const blob = new Blob([plan.implementation_document], { type: "text/markdown" });
    const name = ensureExtension(currentDownloadName, ".md");
    await saveBlobWithPicker(blob, name, "text/markdown", ".md");
  };

  const copyForGoogleDocs = async () => {
    setCopying(true);
    try {
      const html = await marked.parse(plan.implementation_document);
      const plainText = plan.implementation_document;
      const blob = new Blob([html], { type: "text/html" });
      const plainBlob = new Blob([plainText], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": blob, "text/plain": plainBlob }),
      ]);
      alert("Plan copied to clipboard as Rich Text. You can now paste (Ctrl+V) directly into Google Docs!");
    } catch (err) {
      console.error("Copy failed:", err);
      alert("Failed to copy. Try downloading as Markdown or Word instead.");
    } finally {
      setCopying(false);
    }
  };

  const downloadWord = async () => {
    setExporting(true);
    try {
      const htmlContent = await marked.parse(plan.implementation_document);
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: "Calibri", sans-serif; line-height: 1.5; }
            h1 { color: #1a365d; }
            h2 { color: #2c5282; margin-top: 24pt; border-bottom: 1px solid #e2e8f0; }
            h3 { color: #2d3748; margin-top: 18pt; }
            code { background-color: #f7fafc; color: #e53e3e; padding: 2px; border-radius: 4px; }
            pre { background-color: #1a202c; color: #f7fafc; padding: 12px; border-radius: 6px; }
            blockquote { border-left: 4px solid #4299e1; padding-left: 12px; color: #4a5568; font-style: italic; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background-color: #edf2f7; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(plan.title)}</h1>
          <p><em>${escapeHtml(plan.summary)}</em></p>
          <hr/>
          ${htmlContent}
        </body>
        </html>
      `;
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: fullHtml, title: plan.title }),
      });
      if (!response.ok) throw new Error("Server failed to generate Docx");
      const docxBlob = await response.blob();
      const name = ensureExtension(currentDownloadName, ".docx");
      await saveBlobWithPicker(
        docxBlob,
        name,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".docx"
      );
    } catch (err) {
      console.error("Word export failed:", err);
      alert("Failed to export Word document. Please try Markdown or Copy for GDocs.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Plan header card */}
      <section className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-slate-800/60 backdrop-blur-md p-6 shadow-lg shadow-blue-500/5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-400 font-semibold">
                Generated Action Plan
              </p>
              <h2 className="text-2xl font-bold text-white leading-tight">{plan.title}</h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">{plan.summary}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 shrink-0">
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-center">
                <div className="text-lg font-bold text-blue-400">{safeMilestones.length}</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Milestones</div>
              </div>
            </div>
          </div>

          {/* Export buttons */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
            <button
              onClick={downloadMarkdown}
              className="w-full sm:w-auto text-xs px-3 py-2 rounded-lg border border-slate-600 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-150 flex items-center justify-center gap-2"
              title="Download as raw Markdown file"
            >
              <span>📄</span> Markdown
            </button>
            <button
              onClick={downloadWord}
              disabled={exporting}
              className="w-full sm:w-auto text-xs px-3 py-2 rounded-lg border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
              title="Download as Microsoft Word document"
            >
              <span>{exporting ? "⏳" : "📝"}</span> Word Doc
            </button>
            <button
              onClick={copyForGoogleDocs}
              disabled={copying}
              className="w-full sm:w-auto text-xs px-3 py-2 rounded-lg border border-green-500/40 bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
              title="Copy as Rich Text for Google Docs"
            >
              <span>{copying ? "⏳" : "📋"}</span> Copy for GDocs
            </button>
          </div>

          {/* Save-as filename */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="save-as-filename" className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Save as:
            </label>
            <input
              id="save-as-filename"
              type="text"
              value={downloadFilename}
              onChange={(e) => setDownloadFilename(e.target.value)}
              placeholder={defaultDownloadName}
              className="flex-1 min-w-0 rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Filename used for Markdown and Word downloads (extension added automatically)"
            />
            <span className="text-xs text-slate-600 self-start sm:self-auto">.md / .docx</span>
          </div>
        </div>
      </section>

      {/* Split layout: playbook + milestones */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Implementation playbook */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-md p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
            Implementation Playbook
          </h3>
          <div className="prose prose-sm max-w-none prose-invert prose-headings:text-white prose-headings:font-bold prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-a:text-blue-400 prose-blockquote:border-blue-500 prose-blockquote:text-slate-400 prose-hr:border-slate-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {plan.implementation_document}
            </ReactMarkdown>
          </div>
        </div>

        {/* Milestones sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 h-fit">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-md p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Milestones</h3>
            <p className="text-xs text-slate-500">
              Track progress as you work through the plan.
            </p>
          </div>
          {safeMilestones.length > 0 ? (
            <div className="space-y-3">
              {safeMilestones.map((m, i) => (
                <MilestoneCard
                  key={i}
                  milestone={m}
                  done={!!milestoneDone[i]}
                  onToggle={() => toggleMilestone(i)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/40 p-4 text-sm text-slate-500">
              No milestones returned for this plan.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
