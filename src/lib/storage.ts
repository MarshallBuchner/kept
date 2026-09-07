import { classify, extractFacts, titleFromText } from "./classify";
import type { Clip } from "./types";

const KEY = "kept:clips:v1";

export function loadClips(): Clip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Clip[];
    if (!Array.isArray(parsed)) return [];
    return refreshClips(parsed);
  } catch {
    return [];
  }
}

export function refreshClips(clips: Clip[]): Clip[] {
  const seen = new Set<string>();
  const next: Clip[] = [];
  for (const clip of clips) {
    const key = clip.text.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push({
      ...clip,
      kind: classify(clip.text),
      title: titleFromText(clip.text),
      facts: extractFacts(clip.text),
    });
  }
  saveClips(next);
  return next;
}

export function saveClips(clips: Clip[]) {
  localStorage.setItem(KEY, JSON.stringify(clips));
}

export function upsertClip(clip: Clip): Clip[] {
  const next = [clip, ...loadClips().filter((c) => c.id !== clip.id)];
  saveClips(next);
  return next;
}

export function getClip(id: string): Clip | undefined {
  return loadClips().find((c) => c.id === id);
}

export function deleteClip(id: string): Clip[] {
  const next = loadClips().filter((c) => c.id !== id);
  saveClips(next);
  return next;
}
