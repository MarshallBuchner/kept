export type AnalyticsEvent =
  | "scan_started"
  | "scan_completed"
  | "export_clicked"
  | "paywall_viewed"
  | "checkout_started"
  | "paid";

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

const QUEUE_KEY = "kept:analytics:v1";
const MAX_QUEUE = 200;

type QueuedEvent = {
  event: AnalyticsEvent;
  props?: AnalyticsProps;
  ts: string;
};

/**
 * Lightweight funnel analytics for monetizable beta.
 * Queues locally and forwards to window.keptAnalytics / dataLayer when present.
 */
export function track(event: AnalyticsEvent, props?: AnalyticsProps) {
  if (typeof window === "undefined") return;

  const payload: QueuedEvent = {
    event,
    props: props ? stripUndefined(props) : undefined,
    ts: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue = raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
    queue.push(payload);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* private mode / quota */
  }

  const w = window as Window & {
    keptAnalytics?: { track: (name: string, props?: AnalyticsProps) => void };
    dataLayer?: Array<Record<string, unknown>>;
  };

  try {
    w.keptAnalytics?.track(event, payload.props);
  } catch {
    /* ignore adapter errors */
  }

  try {
    w.dataLayer?.push({ event, ...payload.props, kept_ts: payload.ts });
  } catch {
    /* ignore */
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[kept:analytics]", event, payload.props ?? {});
  }
}

export function readAnalyticsQueue(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

function stripUndefined(props: AnalyticsProps): AnalyticsProps {
  const out: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}
