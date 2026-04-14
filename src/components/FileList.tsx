"use client";

interface FileItem {
  name: string;
  size: number;
  content: string;
  lastModified?: number;
}

interface FileListProps {
  files: FileItem[];
  onRemove: (index: number) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-500">
        {files.length} file{files.length !== 1 && "s"} uploaded
      </h3>
      <ul className="space-y-1">
        {files.map((file, i) => (
          <li
            key={`${file.name}-${i}`}
            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-gray-400 text-sm">📄</span>
              <span className="text-sm text-gray-700 truncate">{file.name}</span>
              <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
              {file.lastModified != null && (
                <span className="text-xs text-gray-400 whitespace-nowrap" title="Source last modified">
                  {formatDate(file.lastModified)}
                </span>
              )}
            </div>
            <button
              onClick={() => onRemove(i)}
              className="text-gray-400 hover:text-red-500 transition-colors ml-2"
              aria-label={`Remove ${file.name}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
