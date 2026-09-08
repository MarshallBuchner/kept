"use client";

import { useEffect, useRef, useState } from "react";
import { CropEditor } from "@/components/CropEditor";
import {
  IconBack,
  IconCamera,
  IconCheck,
  IconClose,
  IconCrop,
  IconDocument,
  IconEnhance,
  IconFile,
  IconImage,
  IconInvoice,
  IconNote,
  IconReceipt,
  IconRotate,
} from "@/components/Icons";
import { blobPreviewUrl, cropBlob, enhanceBlob, FULL_CROP, rotateBlob, type CropRect } from "@/lib/image";
import { logFeedback } from "@/lib/feedback";
import { processImage } from "@/lib/process";
import { upsertDoc } from "@/lib/storage";
import {
  CATEGORY_LABEL,
  DOC_CATEGORIES,
  type DocCategory,
  type KeptDoc,
} from "@/lib/types";

type Step = "chooser" | "review" | "processing" | "extracted";

const PROCESS_STEPS = [
  "Enhancing image",
  "Straightening document",
  "Extracting text",
  "Almost done…",
] as const;

const CATEGORY_ICONS = {
  receipt: IconReceipt,
  invoice: IconInvoice,
  note: IconNote,
  document: IconDocument,
} as const;

export function CaptureFlow({
  mode,
  onClose,
  onSaved,
}: {
  mode: "scan" | "import";
  onClose: () => void;
  onSaved: (docs: KeptDoc[], id: string) => void;
}) {
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
  const [doc, setDoc] = useState<KeptDoc | null>(null);
  const [extractTab, setExtractTab] = useState<"summary" | "text">("summary");
  const [crop, setCrop] = useState<CropRect>(FULL_CROP);
  const [tool, setTool] = useState<"crop" | "rotate" | "enhance" | "auto">("crop");
  const [fixing, setFixing] = useState(false);
  const [fixMerchant, setFixMerchant] = useState("");
  const [fixDate, setFixDate] = useState("");
  const [fixTotal, setFixTotal] = useState("");

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (step !== "processing") return;
    const id = window.setInterval(() => {
      setProcessIndex((i) => Math.min(i + 1, PROCESS_STEPS.length - 1));
    }, 850);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (!doc || step !== "extracted") return;
    setFixMerchant(doc.facts.merchant ?? doc.title);
    setFixDate(doc.facts.dates[0] ?? "");
    setFixTotal(doc.facts.total ?? "");
    setFixing(false);
  }, [doc, step]);

  function setFile(file: File | Blob) {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setBlob(file);
    setPreview(blobPreviewUrl(file));
    setCrop(FULL_CROP);
    setTool("crop");
    setStep("review");
    setError(null);
  }

  async function runTool(kind: "rotate" | "enhance") {
    if (!blob || busyTool) return;
    setBusyTool(true);
    try {
      const next = kind === "rotate" ? await rotateBlob(blob, 90) : await enhanceBlob(blob);
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
      const cropped = await cropBlob(blob, crop);
      const next = await processImage(cropped, setProgress, category);
      upsertDoc(next);
      setDoc(next);
      setProcessIndex(PROCESS_STEPS.length - 1);
      window.setTimeout(() => setStep("extracted"), 450);
    } catch (err) {
      const message =
        err instanceof Error && /quota|out of space/i.test(err.message)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not process that image.";
      setError(message);
      setStep("review");
    }
  }

  function finish(status: "confirmed" | "needs_fix", patched?: KeptDoc) {
    const current = patched ?? doc;
    if (!current) return;
    const reviewed: KeptDoc = {
      ...current,
      reviewStatus: status,
      reviewedAt: new Date().toISOString(),
    };
    logFeedback(reviewed, status);
    const docs = upsertDoc(reviewed);
    onSaved(docs, reviewed.id);
  }

  function saveFixes() {
    if (!doc) return;
    const total = fixTotal.replace(/[^0-9.]/g, "");
    const merchant = fixMerchant.trim() || doc.title;
    const date = fixDate.trim();
    const patched: KeptDoc = {
      ...doc,
      title: merchant,
      facts: {
        ...doc.facts,
        merchant,
        total: total || doc.facts.total,
        totalIsEstimate: false,
        dates: date ? [date, ...doc.facts.dates.filter((d) => d !== date)] : doc.facts.dates,
      },
    };
    setDoc(patched);
    finish("needs_fix", patched);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-paper">
      <div className="flex h-full w-full max-w-[430px] flex-col bg-paper">
        {step === "chooser" ? (
          <>
            <header className="grid grid-cols-[40px_1fr_40px] items-center px-4 pb-2 pt-3">
              <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center" aria-label="Close">
                <IconClose />
              </button>
              <h1 className="text-center text-[17px] font-semibold">Add to Kept</h1>
              <span />
            </header>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-8 pt-2">
              <div className="flex flex-col gap-3">
                <SourceCard
                  icon={<IconCamera />}
                  title="Camera"
                  subtitle="Take a photo now"
                  preferred={mode === "scan"}
                  onClick={() => cameraRef.current?.click()}
                />
                <SourceCard
                  icon={<IconImage />}
                  title="Photos"
                  subtitle="Choose from library"
                  preferred={mode === "import"}
                  onClick={() => libraryRef.current?.click()}
                />
                <SourceCard
                  icon={<IconFile />}
                  title="Files"
                  subtitle="Import from Files app"
                  onClick={() => libraryRef.current?.click()}
                />
              </div>

              <div>
                <p className="text-[16px] font-semibold text-ink">What are you scanning?</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {DOC_CATEGORIES.map((item) => {
                    const Icon = CATEGORY_ICONS[item];
                    const active = category === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={`flex flex-col items-center gap-2 rounded-[16px] px-3 py-5 ${
                          active ? "bg-accent-soft ring-1 ring-accent/30" : "bg-chip"
                        }`}
                      >
                        <Icon className={active ? "text-accent" : "text-ink"} />
                        <span className={`text-[13px] font-medium ${active ? "text-accent" : "text-ink"}`}>
                          {CATEGORY_LABEL[item]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[16px] bg-[#f4f1e4] px-4 py-3 text-[13px] text-[#6a6248]">
                <p className="font-semibold">Pro tip</p>
                <p className="mt-1 leading-5">
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
            </div>
          </>
        ) : null}

        {step === "review" && preview ? (
          <>
            <header className="grid grid-cols-[64px_1fr_64px] items-center px-3 pb-2 pt-3">
              <button type="button" onClick={() => setStep("chooser")} className="flex h-10 items-center gap-1 text-[15px]">
                <IconBack size={20} />
              </button>
              <h1 className="text-center text-[17px] font-semibold">Crop & Adjust</h1>
              <button
                type="button"
                onClick={() => void continueProcess()}
                className="justify-self-end text-[15px] font-semibold text-ink"
              >
                Next
              </button>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
              <CropEditor src={preview} crop={crop} onChange={setCrop} />
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    label: "Crop",
                    icon: IconCrop,
                    id: "crop" as const,
                    action: () => {
                      setTool("crop");
                      setCrop(FULL_CROP);
                    },
                    disabled: false,
                  },
                  {
                    label: "Rotate",
                    icon: IconRotate,
                    id: "rotate" as const,
                    action: () => {
                      setTool("rotate");
                      void runTool("rotate");
                    },
                    disabled: busyTool,
                  },
                  {
                    label: "Enhance",
                    icon: IconEnhance,
                    id: "enhance" as const,
                    action: () => {
                      setTool("enhance");
                      void runTool("enhance");
                    },
                    disabled: busyTool,
                  },
                  {
                    label: "Auto",
                    icon: IconEnhance,
                    id: "auto" as const,
                    action: () => {
                      setTool("auto");
                      setCrop(FULL_CROP);
                      void runTool("enhance");
                    },
                    disabled: busyTool,
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    onClick={item.action}
                    className={`flex flex-col items-center gap-1 rounded-[14px] px-2 py-3 text-[11px] font-medium disabled:opacity-45 ${
                      tool === item.id ? "bg-accent-soft text-accent ring-1 ring-accent/30" : "bg-chip text-ink"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button
                type="button"
                onClick={() => void continueProcess()}
                className="rounded-[16px] bg-accent px-4 py-[15px] text-[16px] font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </>
        ) : null}

        {step === "processing" && preview ? (
          <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-5 pb-10 pt-10">
            <div className="text-center">
              <h1 className="text-[28px] font-bold tracking-tight">Processing...</h1>
              <p className="mt-2 text-[14px] text-muted">Cleaning your document and extracting text...</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <figure className="overflow-hidden rounded-[16px] bg-card shadow-sm ring-1 ring-rule">
                <img src={preview} alt="Original" className="h-40 w-full object-cover" />
                <figcaption className="px-3 py-2 text-center text-[12px] font-medium text-[#87A07C]">
                  Original
                </figcaption>
              </figure>
              <figure className="overflow-hidden rounded-[16px] bg-card shadow-sm ring-1 ring-rule">
                <img
                  src={preview}
                  alt="Cleaned"
                  className="h-40 w-full object-cover contrast-125 brightness-110 saturate-50"
                />
                <figcaption className="px-3 py-2 text-center text-[12px] font-medium text-accent">
                  Cleaned
                </figcaption>
              </figure>
            </div>
            <ul className="rounded-[18px] bg-chip px-4 py-2">
              {PROCESS_STEPS.map((label, index) => {
                const done = index < processIndex || progress > (index + 1) / PROCESS_STEPS.length;
                const current = index === processIndex && !done;
                return (
                  <li key={label} className="flex items-center gap-3 border-b border-rule/70 py-3 last:border-0">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        done
                          ? "bg-accent text-white animate-check"
                          : current
                            ? "border-[1.5px] border-accent text-accent animate-pulse-soft"
                            : "border-[1.5px] border-rule text-muted"
                      }`}
                    >
                      {done ? <IconCheck size={13} /> : null}
                    </span>
                    <span className="text-[14px] text-[#555]">{label}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-center text-[12px] text-muted">Reading text… {Math.round(progress * 100)}%</p>
          </div>
        ) : null}

        {step === "extracted" && doc ? (
          <>
            <header className="grid grid-cols-[40px_1fr_40px] items-center px-3 pb-2 pt-3">
              <button type="button" onClick={() => setStep("review")} className="flex h-10 w-10 items-center justify-center">
                <IconBack />
              </button>
              <h1 className="text-center text-[17px] font-semibold">Extracted Text</h1>
              <span />
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-8">
              <div className="flex rounded-full bg-chip p-1">
                {(
                  [
                    ["summary", "Summary"],
                    ["text", "Full Text"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setExtractTab(id)}
                    className={`flex-1 rounded-full px-3 py-2 text-[13px] font-semibold ${
                      extractTab === id ? "bg-accent text-white" : "text-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {extractTab === "summary" ? (
                <div className="rounded-[18px] bg-card px-5 py-5 shadow-sm ring-1 ring-rule">
                  <p className="text-center text-[15px] font-bold tracking-wide">
                    {(doc.facts.merchant ?? doc.title).toUpperCase()}
                  </p>
                  <p className="mt-1 text-center text-[12px] text-muted">
                    {doc.facts.dates[0] ?? new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                  <ul className="mt-5 space-y-2 border-t border-rule pt-4">
                    {(doc.facts.items ?? []).length > 0 ? (
                      (doc.facts.items ?? []).map((item) => {
                        const dollar = item.lastIndexOf("$");
                        const name =
                          dollar > 0 ? item.slice(0, dollar).replace(/[\s·•]+$/g, "").trim() : item;
                        const price = dollar > 0 ? item.slice(dollar) : "";
                        return (
                          <li key={item} className="flex justify-between gap-3 text-[14px]">
                            <span>{name}</span>
                            <span className="tabular-nums text-muted">{price.replace("$", "")}</span>
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-[14px] text-muted">No line items detected.</li>
                    )}
                    {doc.facts.total ? (
                      <li className="flex justify-between border-t border-rule pt-3 text-[15px] font-semibold">
                        <span>{doc.facts.totalIsEstimate ? "About" : "Total"}</span>
                        <span>${doc.facts.total}</span>
                      </li>
                    ) : null}
                  </ul>
                  {doc.facts.itemsLikelyIncomplete ? (
                    <p className="mt-3 text-[12px] leading-5 text-muted">
                      Total looks right, but some line items may be missing.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[18px] bg-card px-4 py-4 shadow-sm ring-1 ring-rule">
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-6 text-ink">{doc.text}</pre>
                </div>
              )}

              <div className="space-y-2">
                <MetaRow label="Category" value={CATEGORY_LABEL[doc.category]} />
                <MetaRow label="Date" value={doc.facts.dates[0] ?? "—"} />
                <MetaRow label="Merchant" value={doc.facts.merchant ?? doc.title} />
                {doc.facts.totalIsEstimate ? (
                  <p className="rounded-[14px] bg-[#f4f1e4] px-4 py-3 text-[13px] text-[#6a6248]">
                    Total looks estimated — please double-check before saving.
                  </p>
                ) : null}
              </div>

              {fixing ? (
                <div className="space-y-3 rounded-[18px] bg-card p-4 ring-1 ring-rule">
                  <p className="text-[15px] font-semibold text-ink">Fix what looks wrong</p>
                  <label className="block">
                    <span className="text-[12px] text-muted">Merchant</span>
                    <input
                      value={fixMerchant}
                      onChange={(e) => setFixMerchant(e.target.value)}
                      className="mt-1 w-full rounded-[12px] bg-chip px-3 py-2.5 text-[14px] outline-none ring-1 ring-transparent focus:ring-accent/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-muted">Date</span>
                    <input
                      value={fixDate}
                      onChange={(e) => setFixDate(e.target.value)}
                      placeholder="MM/DD/YY"
                      className="mt-1 w-full rounded-[12px] bg-chip px-3 py-2.5 text-[14px] outline-none ring-1 ring-transparent focus:ring-accent/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-muted">Total</span>
                    <input
                      value={fixTotal}
                      onChange={(e) => setFixTotal(e.target.value)}
                      inputMode="decimal"
                      placeholder="35.36"
                      className="mt-1 w-full rounded-[12px] bg-chip px-3 py-2.5 text-[14px] outline-none ring-1 ring-transparent focus:ring-accent/40"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setFixing(false)}
                      className="rounded-[14px] bg-chip px-3 py-3 text-[14px] font-semibold text-ink"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={saveFixes}
                      className="rounded-[14px] bg-accent px-3 py-3 text-[14px] font-semibold text-white"
                    >
                      Save fixes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFixing(true)}
                    className="rounded-[16px] bg-chip px-3 py-[15px] text-[15px] font-semibold text-ink"
                  >
                    Fix this
                  </button>
                  <button
                    type="button"
                    onClick={() => finish("confirmed")}
                    className="rounded-[16px] bg-accent px-3 py-[15px] text-[15px] font-semibold text-white"
                  >
                    Looks right
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function SourceCard({
  icon,
  title,
  subtitle,
  preferred,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  preferred?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 rounded-[16px] px-4 py-4 text-left ${
        preferred ? "bg-accent-soft ring-1 ring-accent/25" : "bg-chip"
      }`}
    >
      <span className="text-ink">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[12px] text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[14px] bg-card px-4 py-3 ring-1 ring-rule">
      <div>
        <p className="text-[12px] text-muted">{label}</p>
        <p className="text-[14px] font-medium text-ink">{value}</p>
      </div>
      <span className="text-muted">›</span>
    </div>
  );
}
