"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { enhanceBlob, rotateBlob, blobPreviewUrl } from "@/lib/image";
import { processImage } from "@/lib/process";
import { upsertDoc } from "@/lib/storage";
import { CATEGORY_LABEL, DOC_CATEGORIES, type DocCategory, type KeptDoc } from "@/lib/types";

type Step = "chooser" | "review" | "processing";

const PROCESS_STEPS = [
  "Enhancing image",
  "Straightening document",
  "Extracting text",
  "Almost done…",
] as const;

export function CaptureFlow({
  mode,
  onClose,
  onSaved,
}: {
  mode: "scan" | "import";
  onClose: () => void;
  onSaved: (docs: KeptDoc[]) => void;
}) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("chooser");
  const [category, setCategory] = useState<DocCategory>("receipt");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processIndex, setProcessIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyTool, setBusyTool] = useState(false);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (step !== "processing") return;
    const id = window.setInterval(() => {
      setProcessIndex((i) => Math.min(i + 1, PROCESS_STEPS.length - 1));
    }, 900);
    return () => window.clearInterval(id);
  }, [step]);

  function setFile(file: File | Blob) {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setBlob(file);
    setPreview(blobPreviewUrl(file));
    setStep("review");
    setError(null);
  }

  async function runTool(kind: "rotate" | "enhance" | "autoclean") {
    if (!blob || busyTool) return;
    setBusyTool(true);
    try {
      const next =
        kind === "rotate" ? await rotateBlob(blob, 90) : await enhanceBlob(blob);
      setFile(next);
    } catch {
      setError("Could not edit that image.");
    } finally {
      setBusyTool(false);
    }
  }

  async function continueProcess() {
    if (!blob) return;
    setStep("processing");
    setProgress(0);
    setProcessIndex(0);
    try {
      const doc = await processImage(blob, setProgress, category);
      const docs = upsertDoc(doc);
      onSaved(docs);
      router.push(`/d/${doc.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that image.");
      setStep("review");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-xl sm:max-h-[90dvh] sm:rounded-3xl animate-fade-up">
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cancel
          </button>
          <p className="text-sm font-semibold text-ink">
            {step === "chooser" ? "Add document" : step === "review" ? "Review" : "Cleaning"}
          </p>
          <span className="w-12" />
        </div>

        {step === "chooser" ? (
          <div className="flex flex-col gap-6 overflow-y-auto px-5 py-6">
            <div className="grid gap-3">
              <SourceButton
                title="Camera"
                subtitle="Take a photo now"
                preferred={mode === "scan"}
                onClick={() => cameraRef.current?.click()}
              />
              <SourceButton
                title="Photos"
                subtitle="Choose from library"
                preferred={mode === "import"}
                onClick={() => libraryRef.current?.click()}
              />
              <SourceButton
                title="Files"
                subtitle="Import from Files"
                preferred={false}
                onClick={() => libraryRef.current?.click()}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-ink">What are you scanning?</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DOC_CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-2xl px-3 py-3 text-left text-sm font-medium ring-1 transition ${
                      category === item
                        ? "bg-accent-soft text-accent ring-accent/30"
                        : "bg-paper text-ink ring-rule"
                    }`}
                  >
                    {CATEGORY_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent-strong">
              <p className="font-semibold">Pro tip</p>
              <p className="mt-1 text-accent-strong/80">
                Good light, flat paper, and filling the frame makes extraction much cleaner.
              </p>
            </div>

            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setFile(file);
                e.target.value = "";
              }}
            />
            <input
              ref={libraryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setFile(file);
                e.target.value = "";
              }}
            />
            {mode === "scan" ? (
              <p className="text-center text-xs text-muted">
                Prefer camera? Tap Camera above to start scanning.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === "review" && preview ? (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            <div className="relative overflow-hidden rounded-3xl bg-ink">
              <img src={preview} alt="Document preview" className="max-h-[48vh] w-full object-contain" />
              <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-accent/80" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Crop", action: () => undefined },
                { label: "Rotate", action: () => void runTool("rotate") },
                { label: "Enhance", action: () => void runTool("enhance") },
                { label: "Auto-clean", action: () => void runTool("autoclean") },
              ].map((tool) => (
                <button
                  key={tool.label}
                  type="button"
                  disabled={busyTool || tool.label === "Crop"}
                  onClick={tool.action}
                  className="rounded-2xl bg-paper px-2 py-3 text-xs font-medium text-ink ring-1 ring-rule disabled:opacity-40"
                >
                  {tool.label}
                </button>
              ))}
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <button
              type="button"
              onClick={() => void continueProcess()}
              className="rounded-2xl bg-accent px-4 py-3.5 text-sm font-semibold text-white"
            >
              Continue
            </button>
          </div>
        ) : null}

        {step === "processing" && preview ? (
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-6">
            <div className="grid grid-cols-2 gap-3">
              <figure className="overflow-hidden rounded-2xl bg-paper ring-1 ring-rule">
                <img src={preview} alt="Original" className="h-36 w-full object-cover" />
                <figcaption className="px-3 py-2 text-xs text-muted">Original</figcaption>
              </figure>
              <figure className="overflow-hidden rounded-2xl bg-paper ring-1 ring-rule">
                <img
                  src={preview}
                  alt="Cleaned"
                  className="h-36 w-full object-cover contrast-125 saturate-50"
                />
                <figcaption className="px-3 py-2 text-xs text-muted">Cleaned</figcaption>
              </figure>
            </div>
            <ul className="flex flex-col gap-3">
              {PROCESS_STEPS.map((label, index) => {
                const done = index < processIndex || progress > (index + 1) / PROCESS_STEPS.length;
                const current = index === processIndex;
                return (
                  <li
                    key={label}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm ${
                      done || current ? "bg-accent-soft text-accent" : "bg-paper text-muted"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        done
                          ? "bg-accent text-white animate-check"
                          : current
                            ? "bg-accent/20 text-accent animate-pulse-soft"
                            : "bg-rule/60 text-muted"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    {label}
                  </li>
                );
              })}
            </ul>
            <p className="text-center text-xs text-muted">
              Reading text… {Math.round(progress * 100)}%
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SourceButton({
  title,
  subtitle,
  preferred,
  onClick,
}: {
  title: string;
  subtitle: string;
  preferred?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 text-left transition ${
        preferred
          ? "border-accent/40 bg-accent-soft"
          : "border-rule bg-paper hover:border-accent/40"
      }`}
    >
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
    </button>
  );
}
