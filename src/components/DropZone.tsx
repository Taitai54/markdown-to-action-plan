"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface UploadedFile {
  name: string;
  size: number;
  content: string;
}

interface DropZoneProps {
  onFilesAdded: (files: UploadedFile[]) => void;
}

export default function DropZone({ onFilesAdded }: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const readers = acceptedFiles
        .filter((f) => f.name.endsWith(".md") || f.name.endsWith(".markdown"))
        .map(
          (file) =>
            new Promise<UploadedFile>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  name: file.name,
                  size: file.size,
                  content: reader.result as string,
                });
              reader.onerror = reject;
              reader.readAsText(file);
            })
        );

      Promise.all(readers).then(onFilesAdded);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/markdown": [".md", ".markdown"] },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <svg
          className="w-12 h-12 text-gray-400"
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
          <p className="text-blue-600 font-medium">Drop your markdown files here</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">
              Drag & drop markdown files here
            </p>
            <p className="text-sm text-gray-400">or click to browse</p>
          </>
        )}
      </div>
    </div>
  );
}
