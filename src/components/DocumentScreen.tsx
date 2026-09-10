"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconBack,
  IconCopy,
  IconDocument,
  IconFile,
  IconMore,
  IconShare,
} from "@/components/Icons";
import { PaywallSheet, type PaywallReason } from "@/components/PaywallSheet";
import { track } from "@/lib/analytics";
import { canExport, recordExport } from "@/lib/billing";
import { encodeShare } from "@/lib/share";
import { deleteDoc, getDoc, updateDoc } from "@/lib/storage";
import { CATEGORY_LABEL, DOC_TAGS, type DocTag, type KeptDoc } from "@/lib/types";

type PrintMode = "itemized" | "photo";

export function DocumentScreen({ id }: { id: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<KeptDoc | null>(null);
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode | null>(null);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);

  useEffect(() => {
    const found = getDoc(id);
    setDoc(found ?? null);
    setNotes(found?.notes ?? "");
  }, [id]);

  useEffect(() => {
    function clearPrint() {
      setPrintMode(null);
    }
    window.addEventListener("afterprint", clearPrint);
    return () => window.removeEventListener("afterprint", clearPrint);
  }, []);

  if (!doc) {
    return (
      <main className="flex flex-col gap-4 px-5 py-16">
        <p className="text-[22px] font-semibold">Document missing</p>
        <Link href="/" className="text-[14px] text-accent">
          Back home
        </Link>
      </main>
    );
  }

  const merchant = doc.facts.merchant ?? doc.title;
  const dateLabel =
    doc.facts.dates[0] ??
    new Date(doc.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const itemLines = (doc.facts.items ?? []).map(splitItemLine);
  const receiptImage = doc.image || doc.thumbnail;

  async function copyText() {
    await navigator.clipboard.writeText(doc!.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function shareDoc() {
    const url = `${window.location.origin}/c?d=${encodeShare(doc!)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: doc!.title, text: doc!.title, url });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function requestExport() {
    track("export_clicked", { surface: "document" });
    if (!canExport()) {
      setPaywall("export_limit");
      return;
    }
    setExportOpen(true);
  }

  function runExport(mode: PrintMode) {
    // Re-check at print time — sheet open alone must not bypass the free limit.
    if (!canExport()) {
      setExportOpen(false);
      setPaywall("export_limit");
      return;
    }
    setExportOpen(false);
    recordExport();
    track("export_clicked", { surface: "document", mode });
    setPrintMode(mode);
    window.setTimeout(() => {
      window.print();
    }, 50);
  }

  function toggleTag(tag: DocTag) {
    const tags = doc!.tags.includes(tag)
      ? doc!.tags.filter((t) => t !== tag)
      : [...doc!.tags, tag];
    const next = updateDoc(doc!.id, { tags });
    setDoc(next.find((d) => d.id === doc!.id) ?? null);
  }

  function saveNotes() {
    const next = updateDoc(doc!.id, { notes });
    setDoc(next.find((d) => d.id === doc!.id) ?? null);
  }

  function remove() {
    deleteDoc(doc!.id);
    router.replace("/archive");
  }

  return (
    <>
      <main
        className={`flex flex-col gap-5 px-5 pb-10 pt-3 animate-fade-up ${
          printMode ? "print:hidden" : ""
        }`}
      >
        <header className="grid grid-cols-[40px_1fr_40px] items-center print:hidden">
          <Link href="/" className="flex h-10 w-10 items-center justify-center" aria-label="Back">
            <IconBack />
          </Link>
          <span />
          <button
            type="button"
            onClick={remove}
            className="ml-auto flex h-10 w-10 items-center justify-center text-muted"
            aria-label="More"
          >
            <IconMore />
          </button>
        </header>

        <section className="flex flex-col items-center text-center">
          <img
            src={receiptImage}
            alt=""
            className="h-28 w-28 rounded-[16px] bg-chip object-contain ring-1 ring-rule"
          />
          <h1 className="mt-4 text-[22px] font-bold tracking-tight">{doc.title}</h1>
          <p className="mt-1 text-[28px] font-bold tabular-nums">
            {doc.facts.total ? `$${doc.facts.total}` : "—"}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            {dateLabel} · {CATEGORY_LABEL[doc.category]}
            {doc.reviewStatus === "confirmed"
              ? " · Checked"
              : doc.reviewStatus === "needs_fix"
                ? " · Corrected"
                : ""}
          </p>
        </section>

        <section className="grid grid-cols-3 gap-3 print:hidden">
          <ActionRound
            label={copied ? "Copied" : "Copy Text"}
            icon={<IconCopy />}
            onClick={() => void copyText()}
          />
          <ActionRound label="Export PDF" icon={<IconFile />} onClick={requestExport} />
          <ActionRound label="Share" icon={<IconShare />} onClick={() => void shareDoc()} />
        </section>

        <section className="overflow-hidden rounded-[18px] bg-card ring-1 ring-rule">
          <DetailRow
            icon={<IconDocument size={18} />}
            label="Category"
            value={CATEGORY_LABEL[doc.category]}
          />
          <DetailRow icon={<IconFile size={18} />} label="Merchant" value={merchant} />
          <DetailRow icon={<IconDocument size={18} />} label="Date" value={dateLabel} />
          <DetailRow
            icon={<IconDocument size={18} />}
            label="Total"
            value={doc.facts.total ? `$${doc.facts.total}` : "—"}
            strong
          />
          {itemLines.length > 0 ? (
            <div className="border-t border-rule px-4 py-3">
              <p className="text-[12px] text-muted">Items</p>
              <ul className="mt-2 space-y-2">
                {itemLines.map((item) => (
                  <li key={`${item.name}-${item.price}`} className="flex justify-between gap-3 text-[14px]">
                    <span className="text-ink">{item.name}</span>
                    <span className="tabular-nums text-muted">{item.price}</span>
                  </li>
                ))}
              </ul>
              {doc.facts.itemsLikelyIncomplete ? (
                <p className="mt-2 text-[12px] text-muted">
                  Some line items may be missing — check the photo or Full Text.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="border-t border-rule px-4 py-3">
            <p className="text-[12px] text-muted">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DOC_TAGS.map((tag) => {
                const active = doc.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                      active ? "bg-accent text-white" : "bg-chip text-ink"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {!doc.tags.length ? <p className="mt-2 text-[13px] text-muted">Add tags...</p> : null}
          </div>
          <div className="border-t border-rule px-4 py-3 print:hidden">
            <p className="text-[12px] text-muted">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={3}
              placeholder="Add a note…"
              className="mt-2 w-full resize-none rounded-[12px] bg-chip px-3 py-2 text-[14px] outline-none"
            />
          </div>
        </section>

        <button
          type="button"
          onClick={() => router.push("/archive")}
          className="rounded-[16px] bg-accent px-4 py-[15px] text-[16px] font-semibold text-white print:hidden"
        >
          Save
        </button>
      </main>

      {exportOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 print:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss"
            onClick={() => setExportOpen(false)}
          />
          <div className="relative w-full max-w-[430px] rounded-t-[22px] bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-lg">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule" />
            <h2 className="text-[18px] font-semibold text-ink">Export PDF</h2>
            <p className="mt-1 text-[13px] text-muted">Choose what to save or share.</p>
            <div className="mt-4 space-y-2">
              <ExportChoice
                title="Itemized list"
                detail="Clean merchant, date, line items, and total — best for expenses."
                onClick={() => runExport("itemized")}
              />
              <ExportChoice
                title="Receipt photo"
                detail="The scanned image as proof of purchase."
                onClick={() => runExport("photo")}
                disabled={!receiptImage}
              />
            </div>
            <button
              type="button"
              onClick={() => setExportOpen(false)}
              className="mt-3 w-full rounded-[14px] bg-chip px-4 py-3 text-[15px] font-medium text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {printMode === "itemized" ? (
        <article className="hidden print:block print-sheet">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Kept</p>
          <h1 className="mt-2 text-[26px] font-bold tracking-tight text-ink">{merchant}</h1>
          <p className="mt-1 text-[14px] text-muted">
            {dateLabel} · {CATEGORY_LABEL[doc.category]}
          </p>
          {itemLines.length > 0 ? (
            <ul className="mt-6 border-t border-rule pt-4">
              {itemLines.map((item) => (
                <li
                  key={`print-${item.name}-${item.price}`}
                  className="flex justify-between gap-6 border-b border-rule/70 py-2.5 text-[14px]"
                >
                  <span>{item.name}</span>
                  <span className="tabular-nums">{item.price || "—"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-[14px] text-muted">No line items saved for this receipt.</p>
          )}
          <div className="mt-4 flex justify-between border-t border-rule pt-3 text-[16px] font-semibold">
            <span>{doc.facts.totalIsEstimate ? "About" : "Total"}</span>
            <span className="tabular-nums">{doc.facts.total ? `$${doc.facts.total}` : "—"}</span>
          </div>
          {notes.trim() ? (
            <div className="mt-6">
              <p className="text-[12px] font-medium uppercase tracking-wide text-muted">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-[14px] text-ink">{notes.trim()}</p>
            </div>
          ) : null}
          {doc.tags.length ? (
            <p className="mt-6 text-[12px] text-muted">Tags · {doc.tags.join(", ")}</p>
          ) : null}
        </article>
      ) : null}

      {printMode === "photo" ? (
        <article className="hidden print:block print-sheet print-sheet-photo">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Kept</p>
          <h1 className="mt-2 text-[22px] font-bold tracking-tight text-ink">{merchant}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {dateLabel}
            {doc.facts.total ? ` · $${doc.facts.total}` : ""}
          </p>
          {receiptImage ? (
            <img
              src={receiptImage}
              alt={`Receipt from ${merchant}`}
              className="mt-5 max-h-[9.5in] w-full object-contain"
            />
          ) : (
            <p className="mt-6 text-[14px] text-muted">No receipt photo available.</p>
          )}
        </article>
      ) : null}

      {paywall ? (
        <PaywallSheet
          reason={paywall}
          onClose={() => {
            setPaywall(null);
            setExportOpen(false);
          }}
          onUnlocked={() => {
            setPaywall(null);
            setExportOpen(true);
          }}
        />
      ) : null}
    </>
  );
}

function splitItemLine(item: string): { name: string; price: string } {
  const dollar = item.lastIndexOf("$");
  if (dollar <= 0) return { name: item, price: "" };
  return {
    name: item.slice(0, dollar).replace(/[\s·•]+$/g, "").trim(),
    price: item.slice(dollar),
  };
}

function ExportChoice({
  title,
  detail,
  onClick,
  disabled,
}: {
  title: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-[16px] bg-chip px-4 py-3.5 text-left disabled:opacity-45"
    >
      <span className="block text-[15px] font-semibold text-ink">{title}</span>
      <span className="mt-0.5 block text-[13px] leading-5 text-muted">{detail}</span>
    </button>
  );
}

function ActionRound({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-chip text-ink">{icon}</span>
      <span className="text-[12px] font-medium text-ink">{label}</span>
    </button>
  );
}

function DetailRow({
  icon,
  label,
  value,
  strong,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-rule px-4 py-3.5 first:border-0">
      <span className="text-ink">{icon}</span>
      <span className="flex-1 text-[14px] text-ink">{label}</span>
      <span className={`text-[14px] ${strong ? "font-semibold text-ink" : "text-muted"}`}>{value}</span>
    </div>
  );
}
