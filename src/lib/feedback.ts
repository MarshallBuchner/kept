import type { KeptDoc, ReviewStatus } from "./types";

const KEY = "kept:feedback:v1";

export type FeedbackEvent = {
  id: string;
  docId: string;
  status: Exclude<ReviewStatus, "unreviewed">;
  at: string;
  merchant?: string;
  total?: string;
  date?: string;
  totalWasEstimate?: boolean;
};

export function logFeedback(
  doc: KeptDoc,
  status: Exclude<ReviewStatus, "unreviewed">,
): FeedbackEvent {
  const event: FeedbackEvent = {
    id: crypto.randomUUID(),
    docId: doc.id,
    status,
    at: new Date().toISOString(),
    merchant: doc.facts.merchant ?? doc.title,
    total: doc.facts.total,
    date: doc.facts.dates[0],
    totalWasEstimate: doc.facts.totalIsEstimate,
  };
  if (typeof window === "undefined") return event;
  try {
    const raw = localStorage.getItem(KEY);
    const prev = raw ? (JSON.parse(raw) as FeedbackEvent[]) : [];
    const next = [event, ...(Array.isArray(prev) ? prev : [])].slice(0, 200);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return event;
}

export function loadFeedback(): FeedbackEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeedbackEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function feedbackSummary() {
  const events = loadFeedback();
  const confirmed = events.filter((e) => e.status === "confirmed").length;
  const needsFix = events.filter((e) => e.status === "needs_fix").length;
  return { total: events.length, confirmed, needsFix };
}
