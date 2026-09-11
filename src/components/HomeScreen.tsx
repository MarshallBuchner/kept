"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CaptureFlow } from "@/components/CaptureFlow";
import { IconCamera, IconChevron, IconImage } from "@/components/Icons";
import { BrandWord } from "@/components/Logo";
import { hasOnboarded, loadDocs } from "@/lib/storage";
import { CATEGORY_LABEL, type KeptDoc } from "@/lib/types";

export function HomeScreen() {
  const router = useRouter();
  const [docs, setDocs] = useState<KeptDoc[]>([]);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<"scan" | "import">("scan");

  useEffect(() => {
    if (!hasOnboarded()) {
      router.replace("/welcome");
      return;
    }
    setDocs(loadDocs());
  }, [router]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 18) return "Good afternoon!";
    return "Good evening!";
  }, []);

  const recent = docs.slice(0, 8);

  return (
    <>
      <div className="flex flex-col gap-6 px-5 pb-4 pt-3 animate-fade-up">
        <header className="flex items-center justify-center">
          <BrandWord className="text-center text-[20px]" />
        </header>

        <section>
          <h1 className="text-[30px] font-bold leading-tight tracking-tight text-ink">{greeting}</h1>
          <p className="mt-1 text-[16px] text-muted">Keep what matters.</p>
        </section>

        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              setCaptureMode("scan");
              setCaptureOpen(true);
            }}
            className="flex h-[72px] items-center gap-4 rounded-[18px] bg-accent px-5 text-white"
          >
            <IconCamera size={24} />
            <span className="flex-1 text-left text-[17px] font-semibold">Scan</span>
            <IconChevron className="opacity-90" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCaptureMode("import");
              setCaptureOpen(true);
            }}
            className="flex h-[72px] items-center gap-4 rounded-[18px] bg-chip px-5 text-ink"
          >
            <IconImage size={24} />
            <span className="flex-1 text-left text-[17px] font-semibold">Import</span>
            <IconChevron />
          </button>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-ink">Recent Documents</h2>
            {docs.length > 0 ? (
              <Link href="/archive" className="text-[14px] font-medium text-accent">
                See all
              </Link>
            ) : null}
          </div>

          {recent.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-rule bg-card px-4 py-10 text-center">
              <p className="text-[15px] font-medium text-ink">Nothing kept yet</p>
              <p className="mt-1 text-[13px] text-muted">
                Scan a receipt or import a photo to start your archive.
              </p>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-[18px] bg-card">
              {recent.map((doc, index) => (
                <li key={doc.id} className={index > 0 ? "border-t border-rule" : ""}>
                  <Link href={`/d/${doc.id}`} className="flex items-center gap-3 px-3 py-3">
                    <img
                      src={doc.thumbnail}
                      alt=""
                      className="h-12 w-12 rounded-[10px] object-cover ring-1 ring-rule"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink">{doc.title}</p>
                      <p className="mt-0.5 truncate text-[12px] text-muted">
                        {CATEGORY_LABEL[doc.category]} · {formatWhen(doc.createdAt)}
                      </p>
                    </div>
                    <IconChevron className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {captureOpen ? (
        <CaptureFlow
          mode={captureMode}
          onClose={() => setCaptureOpen(false)}
          onSaved={(docsNext, id) => {
            setDocs(docsNext);
            setCaptureOpen(false);
            router.push(`/d/${id}`);
          }}
        />
      ) : null}
    </>
  );
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (sameDay) {
    return `Today, ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
