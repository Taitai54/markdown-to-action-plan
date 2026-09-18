import { MasterActionPlan } from "./ai-clients";

export interface UploadedFileRecord {
  name: string;
  size: number;
  content: string;
  sourceType?: string;
  sourceUrl?: string;
  lastModified?: number;
}

export interface SectionPlanEntry {
  chunkTitle: string;
  plan: MasterActionPlan;
  status: "completed" | "failed";
  error?: string;
}

export interface SavedBookSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  files: UploadedFileRecord[];
  chunkSize: number;
  sectionPlans: Record<number, SectionPlanEntry>;
  masterPlan: MasterActionPlan | null;
}

const DB_NAME = "MarkdownToActionPlanDB";
const DB_VERSION = 1;
const STORE_NAME = "book_sessions";

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

export async function saveSession(session: SavedBookSession): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(session);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to save session to IndexedDB:", err);
  }
}

export async function getSession(id: string): Promise<SavedBookSession | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to get session from IndexedDB:", err);
    return null;
  }
}

export async function getAllSessions(): Promise<SavedBookSession[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as SavedBookSession[];
        // Sort newest first
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to get all sessions from IndexedDB:", err);
    return [];
  }
}

export async function deleteSession(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to delete session from IndexedDB:", err);
  }
}

export function generateSessionId(files: UploadedFileRecord[]): string {
  const primaryName = files[0]?.name || "book";
  const cleanName = primaryName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  return `session_${cleanName}_${files.reduce((acc, f) => acc + f.size, 0)}`;
}
