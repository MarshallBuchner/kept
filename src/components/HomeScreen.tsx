"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CaptureFlow } from "@/components/CaptureFlow";
import { BrandWord, LogoMark } from "@/components/Logo";
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
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const recent = docs.slice(0, 6);

  return (
    <>
      <div className="flex flex-col gap-7 px-5 pb-6 pt-8 animate-fade-up">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark size={42} />
            <div>
              <BrandWord className="text-xl font-semibold" />
              <p className="text-xs text-muted">Scan it. Clean it. Keep it.</p>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
            You
          </div>
        </header>

        <section className="rounded-3xl bg-gradient-to-br from-accent to-accent-strong px-5 py-6 text-white shadow-sm">
          <p className="text-sm text-white/75">{greeting}</p>
          <h1 className="mt-1 max-w-xs font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug tracking-tight">
            Turn any photo into a clean document.
          </h1>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setCaptureMode("scan");
                setCaptureOpen(true);
              }}
              className="rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-accent transition hover:bg-white/95"
            >
              Scan
            </button>
            <button
              type="button"
              onClick={() => {
                setCaptureMode("import");
                setCaptureOpen(true);
              }}
              className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
            >
              Import
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold text-ink">Recent</h2>
            {docs.length > 0 ? (
              <Link href="/archive" className="text-xs font-medium text-accent">
                See archive
              </Link>
            ) : null}
          </div>

          {recent.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-rule bg-card px-5 py-10 text-center">
              <p className="text-sm font-medium text-ink">Nothing kept yet</p>
              <p className="mt-1 text-sm text-muted">
                Scan a receipt or import a photo to start your archive.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {recent.map((doc, index) => (
                <li
                  key={doc.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <Link
                    href={`/d/${doc.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-rule bg-card p-3 transition hover:border-accent/30"
                  >
                    <img
                      src={doc.thumbnail}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{doc.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {CATEGORY_LABEL[doc.category]} ·{" "}
                        {new Date(doc.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    {doc.facts.total ? (
                      <p className="text-sm font-semibold tabular-nums text-ink">
                        ${doc.facts.total}
                      </p>
                    ) : null}
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
          onSaved={(docsNext) => {
            setDocs(docsNext);
            setCaptureOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
