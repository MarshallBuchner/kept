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
import { encodeShare } from "@/lib/share";
import { deleteDoc, getDoc, updateDoc } from "@/lib/storage";
import { CATEGORY_LABEL, DOC_TAGS, type DocTag, type KeptDoc } from "@/lib/types";

export function DocumentScreen({ id }: { id: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<KeptDoc | null>(null);
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const found = getDoc(id);
    setDoc(found ?? null);
    setNotes(found?.notes ?? "");
  }, [id]);

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

  function exportPdf() {
    window.print();
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
    <main className="flex flex-col gap-5 px-5 pb-10 pt-3 animate-fade-up print:px-0">
      <header className="grid grid-cols-[40px_1fr_40px] items-center print:hidden">
        <Link href="/" className="flex h-10 w-10 items-center justify-center" aria-label="Back">
          <IconBack />
        </Link>
        <span />
        <button type="button" onClick={remove} className="ml-auto flex h-10 w-10 items-center justify-center text-muted" aria-label="More">
          <IconMore />
        </button>
      </header>

      <section className="flex flex-col items-center text-center">
        <img
          src={doc.image || doc.thumbnail}
          alt=""
          className="h-28 w-28 rounded-[16px] bg-chip object-contain ring-1 ring-rule"
        />
        <h1 className="mt-4 text-[22px] font-bold tracking-tight">{doc.title}</h1>
        <p className="mt-1 text-[28px] font-bold tabular-nums">
          {doc.facts.total ? `$${doc.facts.total}` : "—"}
        </p>
        <p className="mt-1 text-[13px] text-muted">
          {doc.facts.dates[0] ??
            new Date(doc.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
          · {CATEGORY_LABEL[doc.category]}
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
        <ActionRound label="Export PDF" icon={<IconFile />} onClick={exportPdf} />
        <ActionRound label="Share" icon={<IconShare />} onClick={() => void shareDoc()} />
      </section>

      <section className="overflow-hidden rounded-[18px] bg-card ring-1 ring-rule">
        <DetailRow icon={<IconDocument size={18} />} label="Category" value={CATEGORY_LABEL[doc.category]} />
        <DetailRow icon={<IconFile size={18} />} label="Merchant" value={doc.facts.merchant ?? doc.title} />
        <DetailRow
          icon={<IconDocument size={18} />}
          label="Date"
          value={
            doc.facts.dates[0] ??
            new Date(doc.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          }
        />
        <DetailRow
          icon={<IconDocument size={18} />}
          label="Total"
          value={doc.facts.total ? `$${doc.facts.total}` : "—"}
          strong
        />
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
          {!doc.tags.length ? (
            <p className="mt-2 text-[13px] text-muted">Add tags...</p>
          ) : null}
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
