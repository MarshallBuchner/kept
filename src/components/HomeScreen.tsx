"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CaptureFlow } from "@/components/CaptureFlow";
import { IconCamera, IconChevron, IconImage } from "@/components/Icons";
import { BrandWord, KeptPageMark } from "@/components/Logo";
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

  const recent = docs.slice(0, 4);

  return (
    <>
      <div className="relative flex min-h-[calc(100dvh-76px)] flex-col overflow-hidden px-5 pb-5 pt-4 text-white animate-fade-up">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 18%, #6a8570 0%, #516a57 42%, #3a4d40 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(247,248,246,0.55) 1px, transparent 0)",
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(180deg, rgba(0,0,0,0.55), transparent 78%)",
          }}
        />

        <header className="flex items-center justify-center">
          <BrandWord className="text-center text-[20px] text-white" />
        </header>

        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="animate-fade-up" style={{ animationDelay: "40ms" }}>
            <KeptPageMark size={280} />
          </div>
          <p
            className="mt-8 text-[14px] font-medium tracking-wide text-white/75 animate-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            {greeting}
          </p>
          <p
            className="mt-2 max-w-[300px] text-[24px] font-bold leading-tight tracking-tight text-white animate-fade-up"
            style={{ animationDelay: "140ms" }}
          >
            Scan it. Clean it. Keep it.
          </p>
        </section>

        <section
          className="flex flex-col gap-3 animate-fade-up"
          style={{ animationDelay: "180ms" }}
        >
          <button
            type="button"
            onClick={() => {
              setCaptureMode("scan");
              setCaptureOpen(true);
            }}
            className="flex h-[64px] items-center gap-4 rounded-[18px] bg-white px-5 text-accent-strong"
          >
            <IconCamera size={24} />
            <span className="flex-1 text-left text-[17px] font-semibold">Scan</span>
            <IconChevron className="opacity-80" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCaptureMode("import");
              setCaptureOpen(true);
            }}
            className="flex h-[64px] items-center gap-4 rounded-[18px] bg-white/14 px-5 text-white ring-1 ring-white/25 backdrop-blur-sm"
          >
            <IconImage size={24} />
            <span className="flex-1 text-left text-[17px] font-semibold">Import</span>
            <IconChevron className="opacity-80" />
          </button>
        </section>

        {recent.length > 0 ? (
          <section
            className="mt-5 animate-fade-up"
            style={{ animationDelay: "220ms" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-white/85">Recent</h2>
              <Link href="/archive" className="text-[13px] font-medium text-white/75">
                See all
              </Link>
            </div>
            <ul className="overflow-hidden rounded-[18px] bg-white/12 ring-1 ring-white/18 backdrop-blur-md">
              {recent.map((doc, index) => (
                <li key={doc.id} className={index > 0 ? "border-t border-white/12" : ""}>
                  <Link href={`/d/${doc.id}`} className="flex items-center gap-3 px-3 py-3">
                    <img
                      src={doc.thumbnail}
                      alt=""
                      className="h-11 w-11 rounded-[10px] object-cover ring-1 ring-white/20"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-white">{doc.title}</p>
                      <p className="mt-0.5 truncate text-[12px] text-white/65">
                        {CATEGORY_LABEL[doc.category]} · {formatWhen(doc.createdAt)}
                      </p>
                    </div>
                    <IconChevron className="shrink-0 text-white/55" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
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
