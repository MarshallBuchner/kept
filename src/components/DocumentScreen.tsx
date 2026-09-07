"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { encodeShare } from "@/lib/share";
import { deleteDoc, getDoc, updateDoc } from "@/lib/storage";
import {
  CATEGORY_LABEL,
  DOC_TAGS,
  type DocTag,
  type KeptDoc,
} from "@/lib/types";

export function DocumentScreen({ id }: { id: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<KeptDoc | null>(null);
  const [tab, setTab] = useState<"document" | "text" | "summary">("summary");
  const [copied, setCopied] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const found = getDoc(id);
    setDoc(found ?? null);
    setNotes(found?.notes ?? "");
  }, [id]);

  if (!doc) {
    return (
      <main className="flex flex-col gap-4 px-5 py-16">
        <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Document missing
        </p>
        <Link href="/" className="text-sm text-accent">
          Back home
        </Link>
      </main>
    );
  }

  async function copyText() {
    await navigator.clipboard.writeText(doc!.text);
    setCopied("text");
    window.setTimeout(() => setCopied(null), 1400);
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
    setCopied("link");
    window.setTimeout(() => setCopied(null), 1400);
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

  const lines = (doc.facts.items ?? []).map((item) => {
    const dollar = item.lastIndexOf("$");
    if (dollar <= 0) return { name: item, price: "" };
    return {
      name: item.slice(0, dollar).replace(/[\s·•¶¤£¢]+$/g, "").trim(),
      price: item.slice(dollar),
    };
  });

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-6 animate-fade-up print:px-0">
      <header className="flex items-center justify-between print:hidden">
        <Link href="/" className="text-sm text-muted">
          ← Back
        </Link>
        <p className="text-sm font-semibold">{CATEGORY_LABEL[doc.category]}</p>
        <button type="button" onClick={remove} className="text-sm text-muted">
          Delete
        </button>
      </header>

      <div className="overflow-hidden rounded-3xl border border-rule bg-card">
        <img
          src={doc.image || doc.thumbnail}
          alt=""
          className="max-h-64 w-full object-cover object-top"
        />
        <div className="space-y-1 px-5 py-4">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            {doc.title}
          </h1>
          <p className="text-sm text-muted">
            {doc.facts.total ? `$${doc.facts.total}` : "No total found"}
            {doc.facts.dates[0] ? ` · ${doc.facts.dates[0]}` : ""}
          </p>
        </div>
      </div>

      <div className="flex rounded-2xl bg-paper p-1 ring-1 ring-rule print:hidden">
        {(
          [
            ["summary", "Summary"],
            ["document", "Document"],
            ["text", "Full text"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${
              tab === id ? "bg-card text-accent shadow-sm" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <section className="rounded-3xl border border-rule bg-card p-5">
          <dl className="space-y-3 text-sm">
            <Row label="Category" value={CATEGORY_LABEL[doc.category]} />
            <Row label="Merchant" value={doc.facts.merchant ?? "—"} />
            <Row label="Date" value={doc.facts.dates[0] ?? "—"} />
            <Row
              label={doc.facts.totalIsEstimate ? "About" : "Total"}
              value={doc.facts.total ? `$${doc.facts.total}` : "—"}
            />
          </dl>
          {lines.length > 0 ? (
            <ul className="mt-5 space-y-2 border-t border-rule pt-4">
              {lines.map((line) => (
                <li key={`${line.name}-${line.price}`} className="flex justify-between gap-3 text-sm">
                  <span>{line.name}</span>
                  {line.price ? <span className="tabular-nums text-muted">{line.price}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {tab === "document" ? (
        <section className="overflow-hidden rounded-3xl border border-rule bg-card">
          <img src={doc.image || doc.thumbnail} alt="" className="w-full object-contain" />
        </section>
      ) : null}

      {tab === "text" ? (
        <section className="rounded-3xl border border-rule bg-card p-5">
          <div className="mb-3 flex justify-end print:hidden">
            <button
              type="button"
              onClick={() => void copyText()}
              className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent"
            >
              {copied === "text" ? "Copied" : "Copy text"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-ink">{doc.text}</pre>
        </section>
      ) : null}

      <section className="rounded-3xl border border-rule bg-card p-5 print:hidden">
        <h2 className="text-sm font-semibold">Tags</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {DOC_TAGS.map((tag) => {
            const active = doc.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  active ? "bg-accent text-white" : "bg-paper text-muted ring-1 ring-rule"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-semibold">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            rows={3}
            placeholder="Add a note…"
            className="mt-2 w-full rounded-2xl border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </section>

      <div className="grid grid-cols-3 gap-2 print:hidden">
        <button
          type="button"
          onClick={() => void copyText()}
          className="rounded-2xl bg-paper px-3 py-3 text-xs font-semibold text-ink ring-1 ring-rule"
        >
          {copied === "text" ? "Copied" : "Copy text"}
        </button>
        <button
          type="button"
          onClick={exportPdf}
          className="rounded-2xl bg-paper px-3 py-3 text-xs font-semibold text-ink ring-1 ring-rule"
        >
          Export PDF
        </button>
        <button
          type="button"
          onClick={() => void shareDoc()}
          className="rounded-2xl bg-accent px-3 py-3 text-xs font-semibold text-white"
        >
          {copied === "link" ? "Link copied" : "Share"}
        </button>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
