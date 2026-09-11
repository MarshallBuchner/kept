"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandWord, LogoMark } from "@/components/Logo";
import { setOnboarded } from "@/lib/storage";

export function WelcomeScreen() {
  const router = useRouter();

  function start() {
    setOnboarded();
    router.replace("/");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[430px] flex-col bg-paper px-6 pb-10 pt-16">
      <div className="flex flex-1 flex-col items-center justify-center text-center animate-fade-up">
        <LogoMark size={88} />
        <BrandWord className="mt-7 text-[42px] leading-none" />
        <p className="mt-3 text-[17px] font-medium text-ink">Scan it. Clean it. Keep it.</p>
        <p className="mt-3 max-w-[280px] text-[15px] leading-6 text-muted">
          Turn messy receipts and documents into clean, organized files in seconds.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <button
          type="button"
          onClick={start}
          className="w-full rounded-2xl bg-accent px-4 py-[16px] text-[16px] font-semibold text-white"
        >
          Get Started
        </button>
        <p className="text-[12px] text-muted">
          <Link href="/privacy" className="text-accent">
            Privacy
          </Link>
          <span className="mx-2 text-muted">·</span>
          <Link href="/terms" className="text-accent">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
