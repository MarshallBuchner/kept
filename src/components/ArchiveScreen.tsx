"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconFilter, IconFolder, IconMenu, IconSearch } from "@/components/Icons";
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
      if ((DOC_CATEGORIES as readonly string[]).includes(filter)) return doc.category === filter;
      return doc.tags.includes(filter as DocTag);
    });
  }, [docs, filter, query]);

  const folderRows = useMemo(() => {
    return [
      { id: "all" as const, label: "All Documents", count: docs.length },
      ...DOC_CATEGORIES.map((category) => ({
        id: category,
        label: `${CATEGORY_LABEL[category]}s`,
        count: docs.filter((d) => d.category === category).length,
      })),
      ...DOC_TAGS.map((tag) => ({
        id: tag,
        label: tag,
        count: docs.filter((d) => d.tags.includes(tag)).length,
      })),
    ];
  }, [docs]);

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "receipt", label: "Receipts" },
    { id: "invoice", label: "Invoices" },
    { id: "note", label: "Notes" },
    ...DOC_TAGS.map((t) => ({ id: t as Filter, label: t })),
  ];

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

  return (
    <div className="flex flex-col gap-5 px-5 pb-4 pt-3 animate-fade-up">
      <header className="grid grid-cols-[40px_1fr_40px] items-center">
        <button type="button" className="flex h-10 w-10 items-center justify-center" aria-label="Menu">
          <IconMenu />
        </button>
        <h1 className="text-center text-[20px] font-semibold">Archive</h1>
        <span />
      </header>

      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-full bg-chip px-4 py-3">
          <IconSearch className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted"
          />
        </label>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-chip text-ink"
          aria-label="Filters"
        >
          <IconFilter />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium ${
              filter === chip.id ? "bg-accent text-white" : "bg-chip text-ink"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <section>
        <h2 className="text-[16px] font-semibold text-ink">Folders</h2>
        <ul className="mt-3 overflow-hidden rounded-[18px] bg-card ring-1 ring-rule">
          {folderRows.slice(0, 7).map((folder, index) => (
            <li key={folder.id} className={index > 0 ? "border-t border-rule" : ""}>
              <button
                type="button"
                onClick={() => setFilter(folder.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <IconFolder className="text-ink" />
                <span className="flex-1 text-[14px] text-ink">{folder.label}</span>
                <span className="text-[13px] text-muted">{folder.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {grouped.length > 0 ? (
        grouped.map(([month, items]) => (
          <section key={month} className="flex flex-col gap-2">
            <h3 className="text-[15px] font-semibold text-ink">{month}</h3>
            <ul className="overflow-hidden rounded-[18px] bg-card ring-1 ring-rule">
              {items.map((doc, index) => (
                <li key={doc.id} className={index > 0 ? "border-t border-rule" : ""}>
                  <Link href={`/d/${doc.id}`} className="flex items-center gap-3 px-3 py-3">
                    <img
                      src={doc.thumbnail}
                      alt=""
                      className="h-12 w-12 rounded-[10px] object-cover ring-1 ring-rule"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{doc.title}</p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {doc.facts.total ? `$${doc.facts.total} · ` : ""}
                        {new Date(doc.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="text-[14px] text-muted">No documents match that search.</p>
      )}
    </div>
  );
}
