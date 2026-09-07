"use client";

import { useState } from "react";
import { ShareCard, factsFromClip } from "@/components/ShareCard";
import { deleteClip } from "@/lib/storage";
import { encodeShare } from "@/lib/share";
import type { Clip } from "@/lib/types";

export function ClipList({
  clips,
  onChange,
}: {
  clips: Clip[];
  onChange: (clips: Clip[]) => void;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {clips.map((clip) => (
        <li key={clip.id}>
          <ClipRow clip={clip} onChange={onChange} />
        </li>
      ))}
    </ul>
  );
}

function ClipRow({ clip, onChange }: { clip: Clip; onChange: (clips: Clip[]) => void }) {
  const [copied, setCopied] = useState<"link" | "text" | null>(null);

  async function copyLink() {
    const url = `${window.location.origin}/c?d=${encodeShare(clip)}`;
    await navigator.clipboard.writeText(url);
    setCopied("link");
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function copyText() {
    await navigator.clipboard.writeText(clip.text);
    setCopied("text");
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function shareNative() {
    const url = `${window.location.origin}/c?d=${encodeShare(clip)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: clip.title, text: clip.title, url });
        return;
      } catch {
        /* user cancelled or share unsupported; fall through to copy */
      }
    }
    await copyLink();
  }

  return (
    <div className="flex flex-col gap-3">
      <ShareCard {...factsFromClip(clip)} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void shareNative()}
          className="rounded-full bg-ink px-3 py-1.5 text-xs text-paper"
        >
          {copied === "link" ? "Link copied" : "Share card"}
        </button>
        <button
          type="button"
          onClick={() => void copyText()}
          className="rounded-full bg-card px-3 py-1.5 text-xs text-ink ring-1 ring-rule"
        >
          {copied === "text" ? "Text copied" : "Copy text"}
        </button>
        <button
          type="button"
          onClick={() => onChange(deleteClip(clip.id))}
          className="rounded-full px-3 py-1.5 text-xs text-muted"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
