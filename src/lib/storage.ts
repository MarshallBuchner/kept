import { classify, extractFacts, titleFromText } from "./classify";
import type { DocCategory, DocTag, KeptDoc } from "./types";

const KEY = "kept:docs:v2";
const LEGACY_KEY = "kept:clips:v1";
const ONBOARD_KEY = "kept:onboarded";
const MAX_DOCS = 40;

export class StorageQuotaError extends Error {
  constructor() {
    super(
      "This device is out of space for Kept photos. Delete a few saved receipts in Archive, then try again.",
    );
    this.name = "StorageQuotaError";
  }
}

type LegacyClip = {
  id: string;
  createdAt: string;
  kind?: string;
  category?: DocCategory;
  title: string;
  text: string;
  thumbnail: string;
  image?: string;
  facts: KeptDoc["facts"];
  tags?: DocTag[];
  notes?: string;
  reviewStatus?: KeptDoc["reviewStatus"];
  reviewedAt?: string;
};

function mapLegacyKind(kind?: string): DocCategory {
  switch (kind) {
    case "receipt":
      return "receipt";
    case "invoice":
      return "invoice";
    case "note":
    case "recipe":
    case "contact":
      return "note";
    case "document":
    case "event":
    case "other":
    default:
      return "document";
  }
}

function normalizeDoc(raw: LegacyClip): KeptDoc {
  const text = raw.text ?? "";
  return {
    id: raw.id,
    createdAt: raw.createdAt,
    category: raw.category ?? mapLegacyKind(raw.kind) ?? classify(text),
    title: raw.title || titleFromText(text),
    text,
    thumbnail: raw.thumbnail,
    image: raw.image ?? raw.thumbnail,
    facts: raw.facts ?? extractFacts(text),
    tags: raw.tags ?? [],
    notes: raw.notes ?? "",
    reviewStatus: raw.reviewStatus ?? "unreviewed",
    reviewedAt: raw.reviewedAt,
  };
}

function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; code?: number; message?: string };
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    err.code === 22 ||
    /quota/i.test(err.message ?? "")
  );
}

function slimDoc(doc: KeptDoc): KeptDoc {
  const thumb = doc.thumbnail || doc.image;
  return { ...doc, thumbnail: thumb, image: thumb };
}

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARD_KEY) === "1";
}

export function setOnboarded() {
  localStorage.setItem(ONBOARD_KEY, "1");
}

export function loadDocs(): KeptDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyClip[];
    if (!Array.isArray(parsed)) return [];
    const docs = parsed.map(normalizeDoc);
    try {
      saveDocs(docs);
    } catch {
      /* keep in-memory list even if persist fails */
    }
    if (docs.length > 0) localStorage.setItem(ONBOARD_KEY, "1");
    return refreshDocs(docs);
  } catch {
    return [];
  }
}

export function refreshDocs(docs: KeptDoc[]): KeptDoc[] {
  const seen = new Set<string>();
  const next: KeptDoc[] = [];
  for (const doc of docs) {
    const key = doc.text.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const locked =
      doc.reviewStatus === "confirmed" ||
      doc.reviewStatus === "needs_fix" ||
      Boolean(doc.reviewedAt);
    next.push(
      locked
        ? { ...doc, reviewStatus: doc.reviewStatus ?? "unreviewed" }
        : {
            ...doc,
            category: classify(doc.text),
            title: titleFromText(doc.text),
            facts: extractFacts(doc.text),
            reviewStatus: doc.reviewStatus ?? "unreviewed",
          },
    );
  }
  try {
    saveDocs(next);
  } catch {
    /* ignore persist failure during refresh */
  }
  return next;
}

export function saveDocs(docs: KeptDoc[]) {
  const capped = docs.slice(0, MAX_DOCS);
  const attempts: KeptDoc[][] = [
    capped,
    // Drop full images on older docs first (keep newest few crisp).
    capped.map((doc, index) => (index < 8 ? doc : slimDoc(doc))),
    capped.map(slimDoc),
    capped.slice(0, 20).map(slimDoc),
    capped.slice(0, 10).map(slimDoc),
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      localStorage.setItem(KEY, JSON.stringify(attempt));
      return;
    } catch (error) {
      lastError = error;
      if (!isQuotaError(error)) throw error;
    }
  }

  try {
    localStorage.removeItem(LEGACY_KEY);
    localStorage.setItem(KEY, JSON.stringify(capped.slice(0, 5).map(slimDoc)));
    return;
  } catch (error) {
    lastError = error;
  }

  throw isQuotaError(lastError) ? new StorageQuotaError() : lastError;
}

export function upsertDoc(doc: KeptDoc): KeptDoc[] {
  const existing = (() => {
    try {
      return loadDocs();
    } catch {
      return [];
    }
  })();
  const next = [doc, ...existing.filter((d) => d.id !== doc.id)];
  saveDocs(next);
  return next;
}

export function updateDoc(id: string, patch: Partial<KeptDoc>): KeptDoc[] {
  const next = loadDocs().map((doc) => (doc.id === id ? { ...doc, ...patch } : doc));
  saveDocs(next);
  return next;
}

export function getDoc(id: string): KeptDoc | undefined {
  return loadDocs().find((d) => d.id === id);
}

export function deleteDoc(id: string): KeptDoc[] {
  const next = loadDocs().filter((d) => d.id !== id);
  saveDocs(next);
  return next;
}

/** Legacy aliases used by older components during migration */
export const loadClips = loadDocs;
export const upsertClip = upsertDoc;
export const deleteClip = deleteDoc;
export const getClip = getDoc;
export const saveClips = saveDocs;
export const refreshClips = refreshDocs;
