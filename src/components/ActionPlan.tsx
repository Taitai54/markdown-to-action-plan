"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { marked } from "marked";
import { saveAs } from "file-saver";
import { MasterActionPlan, Milestone } from "@/lib/ai-clients";

interface ActionPlanProps {
  plan: MasterActionPlan | null;
}

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const [done, setDone] = useState(false);

  return (
    <div
      className={`border rounded-lg p-3 transition-all ${
        done ? "bg-gray-50 opacity-60" : "bg-white"
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
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-sm font-medium ${
                done ? "line-through text-gray-400" : "text-gray-900"
              }`}
            >
              {milestone.title}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">
              ✅ <strong>Done when:</strong> {milestone.done_when}
            </p>
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${PRIORITY_STYLES[milestone.priority]}`}
            >
              {milestone.priority}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              {milestone.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActionPlan({ plan }: ActionPlanProps) {
  const [copying, setCopying] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (!plan) return null;

  const downloadMarkdown = () => {
    const blob = new Blob([plan.implementation_document], { type: "text/markdown" });
    saveAs(blob, "master-action-plan.md");
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
      saveAs(docxBlob, `${plan.title.replace(/[^a-z0-9]/gi, "_")}.docx`);
    } catch (err) {
      console.error("Word export failed:", err);
      alert("Failed to export Word document. Please try Markdown or Copy for GDocs.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">{plan.title}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadMarkdown}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors flex items-center gap-2"
              title="Download as raw Markdown file"
            >
              <span>📄</span> Markdown
            </button>
            <button
              onClick={downloadWord}
              disabled={exporting}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              title="Download as Microsoft Word document"
            >
              <span>{exporting ? "⏳" : "📝"}</span> Word Doc
            </button>
            <button
              onClick={copyForGoogleDocs}
              disabled={copying}
              className="text-xs px-3 py-1.5 rounded-lg border border-green-100 bg-green-50 hover:bg-green-100 text-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              title="Copy as Rich Text for Google Docs"
            >
              <span>{copying ? "⏳" : "📋"}</span> Copy for GDocs
            </button>
          </div>
        </div>
        <p className="text-gray-600 text-sm italic border-l-4 border-blue-500 pl-4 mb-8">
          {plan.summary}
        </p>

        <div className="prose prose-sm max-w-none prose-blue prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-li:text-gray-700 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {plan.implementation_document}
          </ReactMarkdown>
        </div>
      </div>

      {plan.milestones.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
            Key Milestones
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {plan.milestones.map((m, i) => (
              <MilestoneCard key={i} milestone={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
