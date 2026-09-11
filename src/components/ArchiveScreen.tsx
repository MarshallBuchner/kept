"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconBack, IconChevron, IconFolder, IconSearch } from "@/components/Icons";
import { loadDocs } from "@/lib/storage";
import {
  CATEGORY_LABEL,
  DOC_CATEGORIES,
  DOC_TAGS,
  type DocCategory,
  type DocTag,
  type KeptDoc,
} from "@/lib/types";

type FolderId = "all" | DocCategory | DocTag;

type FolderRow = {
  id: FolderId;
  label: string;
  count: number;
};

export function ArchiveScreen() {
  const [docs, setDocs] = useState<KeptDoc[]>([]);
  const [query, setQuery] = useState("");
  const [openFolder, setOpenFolder] = useState<FolderId | null>(null);

  useEffect(() => {
    setDocs(loadDocs());
  }, []);

  const folderRows = useMemo<FolderRow[]>(() => {
    return [
      { id: "all", label: "All Documents", count: docs.length },
      ...DOC_CATEGORIES.map((category) => ({
        id: category as FolderId,
        label: `${CATEGORY_LABEL[category]}s`,
        count: docs.filter((d) => d.category === category).length,
      })),
      ...DOC_TAGS.map((tag) => ({
        id: tag as FolderId,
        label: tag,
        count: docs.filter((d) => d.tags.includes(tag)).length,
      })),
    ];
  }, [docs]);

  const chips: { id: FolderId; label: string }[] = [
    { id: "all", label: "All" },
    { id: "receipt", label: "Receipts" },
    { id: "invoice", label: "Invoices" },
    { id: "note", label: "Notes" },
    ...DOC_TAGS.map((t) => ({ id: t as FolderId, label: t })),
  ];

  const activeFolder = openFolder
    ? folderRows.find((folder) => folder.id === openFolder) ?? {
        id: openFolder,
        label: folderLabel(openFolder),
        count: 0,
      }
    : null;

  const folderDocs = useMemo(() => {
    if (!openFolder) return [];
    const q = query.trim().toLowerCase();
    return docs.filter((doc) => {
      const matchesFolder =
        openFolder === "all" ||
        ((DOC_CATEGORIES as readonly string[]).includes(openFolder) &&
          doc.category === openFolder) ||
        doc.tags.includes(openFolder as DocTag);
      if (!matchesFolder) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.text.toLowerCase().includes(q) ||
        doc.facts.merchant?.toLowerCase().includes(q)
      );
    });
  }, [docs, openFolder, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, KeptDoc[]>();
    for (const doc of folderDocs) {
      const label = new Date(doc.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      const list = map.get(label) ?? [];
      list.push(doc);
      map.set(label, list);
    }
    return [...map.entries()];
  }, [folderDocs]);

  if (activeFolder) {
    return (
      <div className="flex flex-col gap-5 px-5 pb-4 pt-3 animate-fade-up">
        <header className="grid grid-cols-[40px_1fr_40px] items-center">
          <button
            type="button"
            aria-label="Back to folders"
            onClick={() => {
              setOpenFolder(null);
              setQuery("");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink"
          >
            <IconBack />
          </button>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-[20px] font-semibold">{activeFolder.label}</h1>
            <p className="text-[12px] text-muted">
              {folderDocs.length} {folderDocs.length === 1 ? "document" : "documents"}
            </p>
          </div>
          <span />
        </header>

        <label className="flex items-center gap-2 rounded-full bg-chip px-4 py-3">
          <IconSearch className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${activeFolder.label.toLowerCase()}...`}
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted"
          />
        </label>

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
                      <IconChevron className="shrink-0 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-rule bg-card px-4 py-10 text-center">
            <p className="text-[15px] font-medium text-ink">
              {query.trim() ? "No matches in this folder" : `No ${activeFolder.label.toLowerCase()} yet`}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {query.trim()
                ? "Try a different search."
                : "Scan or import something to fill this folder."}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-4 pt-3 animate-fade-up">
      <header className="flex items-center justify-center">
        <h1 className="text-center text-[20px] font-semibold">Archive</h1>
      </header>

      <label className="flex items-center gap-2 rounded-full bg-chip px-4 py-3">
        <IconSearch className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search folders..."
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => {
              setQuery("");
              setOpenFolder(chip.id);
            }}
            className="shrink-0 rounded-full bg-chip px-3.5 py-2 text-[13px] font-medium text-ink"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <section>
        <h2 className="text-[16px] font-semibold text-ink">Folders</h2>
        <ul className="mt-3 overflow-hidden rounded-[18px] bg-card ring-1 ring-rule">
          {folderRows
            .filter((folder) => {
              const q = query.trim().toLowerCase();
              return !q || folder.label.toLowerCase().includes(q);
            })
            .slice(0, 7)
            .map((folder, index) => (
              <li key={folder.id} className={index > 0 ? "border-t border-rule" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setOpenFolder(folder.id);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <IconFolder className="text-ink" />
                  <span className="flex-1 text-[14px] text-ink">{folder.label}</span>
                  <span className="text-[13px] text-muted">{folder.count}</span>
                  <IconChevron className="shrink-0 text-muted" />
                </button>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function folderLabel(id: FolderId) {
  if (id === "all") return "All Documents";
  if ((DOC_CATEGORIES as readonly string[]).includes(id)) {
    return `${CATEGORY_LABEL[id as DocCategory]}s`;
  }
  return id;
}
