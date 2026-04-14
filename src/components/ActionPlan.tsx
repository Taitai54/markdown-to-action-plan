"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useMemo, useEffect } from "react";
import { marked } from "marked";
import { saveAs } from "file-saver";
import { MasterActionPlan, Milestone } from "@/lib/ai-clients";

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
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const [done, setDone] = useState(false);

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        done ? "bg-gray-50 opacity-70 border-gray-200" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={() => setDone(!done)}
          className="mt-1 h-4 w-4 rounded border-gray-300 accent-blue-600"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
              {milestone.category}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${PRIORITY_STYLES[milestone.priority]}`}
            >
              {milestone.priority}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-sm font-medium ${
                done ? "line-through text-gray-400" : "text-gray-900"
              }`}
            >
              {milestone.title}
            </h3>
          </div>
          <p className="text-[12px] text-gray-600 mt-2">
            <strong>Done when:</strong> {milestone.done_when}
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

  useEffect(() => {
    if (plan) setDownloadFilename(defaultDownloadName);
  }, [plan, defaultDownloadName]);

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

      const data = [
        new ClipboardItem({
          "text/html": blob,
          "text/plain": plainBlob,
        }),
      ];

      await navigator.clipboard.write(data);
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
          <h1>${plan.title}</h1>
          <p><em>${plan.summary}</em></p>
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
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold">
                Generated Action Plan
              </p>
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">{plan.title}</h2>
              <p className="text-gray-700 text-sm leading-relaxed max-w-3xl">{plan.summary}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 shrink-0">
              <div className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-center">
                <div className="text-lg font-bold text-blue-700">{safeMilestones.length}</div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">Milestones</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
            <button
              onClick={downloadMarkdown}
              className="w-full sm:w-auto text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors flex items-center justify-center gap-2"
              title="Download as raw Markdown file"
            >
              <span>📄</span> Markdown
            </button>
            <button
              onClick={downloadWord}
              disabled={exporting}
              className="w-full sm:w-auto text-xs px-3 py-2 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              title="Download as Microsoft Word document"
            >
              <span>{exporting ? "⏳" : "📝"}</span> Word Doc
            </button>
            <button
              onClick={copyForGoogleDocs}
              disabled={copying}
              className="w-full sm:w-auto text-xs px-3 py-2 rounded-lg border border-green-100 bg-green-50 hover:bg-green-100 text-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              title="Copy as Rich Text for Google Docs"
            >
              <span>{copying ? "⏳" : "📋"}</span> Copy for GDocs
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="save-as-filename" className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Save as:
            </label>
            <input
              id="save-as-filename"
              type="text"
              value={downloadFilename}
              onChange={(e) => setDownloadFilename(e.target.value)}
              placeholder={defaultDownloadName}
              className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Filename used for Markdown and Word downloads (extension added automatically)"
            />
            <span className="text-xs text-gray-400 self-start sm:self-auto">.md / .docx</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            Implementation Playbook
          </h3>
          <div className="prose prose-sm max-w-none text-gray-800 prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-800 prose-li:text-gray-800 prose-strong:text-gray-900 prose-a:text-blue-700 prose-code:text-blue-700 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {plan.implementation_document}
            </ReactMarkdown>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 h-fit">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Milestones</h3>
            <p className="text-xs text-gray-500">
              Track progress as you work through the plan.
            </p>
          </div>
          {safeMilestones.length > 0 ? (
            <div className="space-y-3">
              {safeMilestones.map((m, i) => (
                <MilestoneCard key={i} milestone={m} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
              No milestones returned for this plan.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
