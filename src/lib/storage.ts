import { classify, extractFacts, titleFromText } from "./classify";
import type { DocCategory, DocTag, KeptDoc } from "./types";

const KEY = "kept:docs:v2";
const LEGACY_KEY = "kept:clips:v1";
const ONBOARD_KEY = "kept:onboarded";

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
  };
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
    saveDocs(docs);
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
    next.push({
      ...doc,
      category: classify(doc.text),
      title: titleFromText(doc.text),
      facts: extractFacts(doc.text),
    });
  }
  saveDocs(next);
  return next;
}

export function saveDocs(docs: KeptDoc[]) {
  localStorage.setItem(KEY, JSON.stringify(docs));
}

export function upsertDoc(doc: KeptDoc): KeptDoc[] {
  const next = [doc, ...loadDocs().filter((d) => d.id !== doc.id)];
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
