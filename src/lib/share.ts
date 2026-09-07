import type { Clip, ClipKind } from "./types";

type SharePayload = {
  k: ClipKind;
  t: string;
  x: string;
  f: Clip["facts"];
};

export function encodeShare(clip: Pick<Clip, "kind" | "title" | "text" | "facts">): string {
  const payload: SharePayload = {
    k: clip.kind,
    t: clip.title,
    x: clip.text.slice(0, 4000),
    f: clip.facts,
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeShare(token: string): SharePayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token)) as SharePayload;
    if (!parsed?.t || !parsed?.k) return null;
    return {
      k: parsed.k,
      t: parsed.t,
      x: parsed.x ?? "",
      f: parsed.f ?? { amounts: [], dates: [], phones: [], emails: [] },
    };
  } catch {
    return null;
  }
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(token: string): string {
  const padded = token.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((token.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
