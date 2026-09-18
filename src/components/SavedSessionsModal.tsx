"use client";

import { useEffect, useState } from "react";
import { SavedBookSession, getAllSessions, deleteSession } from "@/lib/storage";

interface SavedSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (session: SavedBookSession) => void;
}

export default function SavedSessionsModal({
  isOpen,
  onClose,
  onSelectSession,
}: SavedSessionsModalProps) {
  const [sessions, setSessions] = useState<SavedBookSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    getAllSessions().then((list) => {
      if (isMounted) {
        setSessions(list);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this saved book session?")) {
      await deleteSession(id);
      const list = await getAllSessions();
      setSessions(list);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📚</span> Saved Books & Offline Sessions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Reload previously saved books, chunks, and generated section plans anytime.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Search / Filter */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved books..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* List of Sessions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Loading saved sessions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="text-2xl">📖</div>
              <p className="text-sm text-slate-400 font-medium">No saved book sessions found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When you upload a book or run chunking & synthesis, your session and generated section plans will automatically save here so you can resume work offline anytime.
              </p>
            </div>
          ) : (
            filtered.map((s) => {
              const fileCount = s.files?.length || 0;
              const sectionPlansCount = Object.keys(s.sectionPlans || {}).length;
              const hasMasterPlan = !!s.masterPlan;
              const formattedDate = new Date(s.updatedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelectSession(s);
                    onClose();
                  }}
                  className="group relative rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/80 hover:border-blue-500/50 p-4 transition-all duration-150 cursor-pointer shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-white truncate group-hover:text-blue-300">
                          {s.title}
                        </h3>
                        {hasMasterPlan && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                            Master Plan Ready
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span>📄 {fileCount} file{fileCount !== 1 ? "s" : ""}</span>
                        <span>•</span>
                        <span>
                          🧩 {sectionPlansCount} section plan{sectionPlansCount !== 1 ? "s" : ""} saved
                        </span>
                        <span>•</span>
                        <span>Saved {formattedDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDelete(e, s.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/30 transition-all"
                        title="Delete saved session"
                      >
                        🗑️ Delete
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-all"
                      >
                        Reload 📂
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <span>Saved locally in browser (IndexedDB)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
