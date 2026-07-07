"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface UploadedFile {
  name: string;
  size: number;
  content: string;
  lastModified?: number;
}

interface DropZoneProps {
  onFilesAdded: (files: UploadedFile[]) => void;
}

export default function DropZone({ onFilesAdded }: DropZoneProps) {
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setProcessing(true);

      const results = await Promise.all(
        acceptedFiles.map((file): Promise<UploadedFile | null> => {
          const name = file.name.toLowerCase();

          // PDF: send to server-side parser
          if (name.endsWith(".pdf")) {
            return (async () => {
              try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/parse-pdf", {
                  method: "POST",
                  body: formData,
                });
                if (!res.ok) return null;
                const data = await res.json();
                return {
                  name: file.name,
                  size: file.size,
                  content: data.text as string,
                  lastModified: file.lastModified,
                };
              } catch {
                return null;
              }
            })();
          }

          // TXT, CSV, MD, Markdown: read directly as text
          if (
            name.endsWith(".txt") ||
            name.endsWith(".csv") ||
            name.endsWith(".md") ||
            name.endsWith(".markdown")
          ) {
            return new Promise<UploadedFile | null>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  name: file.name,
                  size: file.size,
                  content: reader.result as string,
                  lastModified: file.lastModified,
                });
              reader.onerror = reject;
              reader.readAsText(file);
            });
          }

          return Promise.resolve(null);
        })
      );

      setProcessing(false);
      onFilesAdded(results.filter((f): f is UploadedFile => f !== null));
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/markdown": [".md", ".markdown"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
        isDragActive
          ? "border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          : "border-slate-600 hover:border-slate-500 bg-slate-800/60 backdrop-blur-md"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        {processing ? (
          <>
            <svg
              className="animate-spin w-10 h-10 text-blue-400"
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
            <p className="text-blue-400 font-medium">Processing files…</p>
          </>
        ) : (
          <>
            <svg
              className="w-12 h-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {isDragActive ? (
              <p className="text-blue-400 font-medium">Drop your files here</p>
            ) : (
              <>
                <p className="text-slate-300 font-medium">
                  Drag & drop files here
                </p>
                <p className="text-sm text-slate-500">
                  Supports .md, .pdf, .txt, .csv — or click to browse
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
