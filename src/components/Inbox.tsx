"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { processImage } from "@/lib/process";
import { loadClips, upsertClip } from "@/lib/storage";
import type { Clip, ClipKind } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";
import { ClipList } from "./ClipList";

const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic"];

export function Inbox() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [filter, setFilter] = useState<ClipKind | "all">("all");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setClips(loadClips());
  }, []);

  const ingest = useCallback(async (files: FileList | File[]) => {
    const images = [...files].filter(
      (file) => ACCEPT.includes(file.type) || file.type.startsWith("image/"),
    );
    if (!images.length) {
      setError("Drop a screenshot or photo — PDFs come later.");
      return;
    }
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      let latest = loadClips();
      for (const file of images) {
        const clip = await processImage(file, setProgress);
        latest = upsertClip(clip);
      }
      setClips(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }, []);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const items = event.clipboardData?.files;
      if (items?.length) {
        event.preventDefault();
        void ingest(items);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [ingest]);

  const visible = filter === "all" ? clips : clips.filter((c) => c.kind === filter);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-10 sm:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-serif text-4xl tracking-tight text-ink">Kept</p>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted">
            Drop a screenshot. We pull out the useful bit — then you can send a card, not a blurry
            crop.
          </p>
        </div>
        <p className="text-xs text-muted">Stays on this device. No account.</p>
      </header>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void ingest(e.dataTransfer.files);
        }}
        className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-rule bg-card"
        }`}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void ingest(e.target.files);
            e.target.value = "";
          }}
        />
        {busy ? (
          <p className="text-sm text-ink">Reading screenshot… {Math.round(progress * 100)}%</p>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">Drop, paste, or click to add</p>
            <p className="mt-1 text-xs text-muted">PNG, JPG, WebP. First result in about a minute.</p>
          </>
        )}
      </section>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      {clips.length > 0 ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
            {(Object.keys(KIND_LABEL) as ClipKind[]).map((kind) => (
              <FilterChip
                key={kind}
                label={KIND_LABEL[kind]}
                active={filter === kind}
                onClick={() => setFilter(kind)}
              />
            ))}
          </div>
          <ClipList clips={visible} onChange={setClips} />
        </div>
      ) : (
        !busy && (
          <p className="text-sm text-muted">
            Try a receipt, a calendar invite, a recipe, or a contact screenshot from your camera
            roll.
          </p>
        )
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs ${
        active ? "bg-ink text-paper" : "bg-card text-muted ring-1 ring-rule"
      }`}
    >
      {label}
    </button>
  );
}
