"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { loadDocs } from "@/lib/storage";
import {
  CATEGORY_LABEL,
  DOC_CATEGORIES,
  DOC_TAGS,
  type DocCategory,
  type DocTag,
  type KeptDoc,
} from "@/lib/types";

type Filter = "all" | DocCategory | DocTag;

export function ArchiveScreen() {
  const [docs, setDocs] = useState<KeptDoc[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    setDocs(loadDocs());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((doc) => {
      const matchesQuery =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.text.toLowerCase().includes(q) ||
        doc.facts.merchant?.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (filter === "all") return true;
      if ((DOC_CATEGORIES as readonly string[]).includes(filter)) {
        return doc.category === filter;
      }
      return doc.tags.includes(filter as DocTag);
    });
  }, [docs, filter, query]);

  const folders = useMemo(() => {
    return DOC_CATEGORIES.map((category) => ({
      category,
      count: docs.filter((d) => d.category === category).length,
    }));
  }, [docs]);

  const grouped = useMemo(() => {
    const map = new Map<string, KeptDoc[]>();
    for (const doc of filtered) {
      const label = new Date(doc.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      const list = map.get(label) ?? [];
      list.push(doc);
      map.set(label, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...DOC_CATEGORIES.map((c) => ({ id: c as Filter, label: CATEGORY_LABEL[c] })),
    ...DOC_TAGS.map((t) => ({ id: t as Filter, label: t })),
  ];

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-8 animate-fade-up">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Archive
        </h1>
        <p className="mt-1 text-sm text-muted">Searchable files, still on this device.</p>
      </header>

      <label className="flex items-center gap-2 rounded-2xl border border-rule bg-card px-4 py-3">
        <span className="text-muted" aria-hidden>
          ⌕
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search receipts, notes, totals…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === chip.id
                ? "bg-accent text-white"
                : "bg-card text-muted ring-1 ring-rule"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-rule bg-card p-4">
        <h2 className="text-sm font-semibold text-ink">Folders</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {folders.map((folder) => (
            <button
              key={folder.category}
              type="button"
              onClick={() => setFilter(folder.category)}
              className="rounded-2xl bg-paper px-3 py-3 text-left ring-1 ring-rule"
            >
              <p className="text-sm font-medium text-ink">{CATEGORY_LABEL[folder.category]}</p>
              <p className="mt-1 text-xs text-muted">{folder.count} kept</p>
            </button>
          ))}
        </ul>
      </section>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted">No documents match that search.</p>
      ) : (
        grouped.map(([month, items]) => (
          <section key={month} className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {month}
            </h3>
            <ul className="flex flex-col gap-2">
              {items.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/d/${doc.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-rule bg-card p-3"
                  >
                    <img
                      src={doc.thumbnail}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{doc.title}</p>
                      <p className="text-xs text-muted">
                        {CATEGORY_LABEL[doc.category]}
                        {doc.facts.total ? ` · $${doc.facts.total}` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
