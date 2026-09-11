"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandWord, KeptPageMark } from "@/components/Logo";
import { setOnboarded } from "@/lib/storage";

export function WelcomeScreen() {
  const router = useRouter();

  function start() {
    setOnboarded();
    router.replace("/");
  }

  return (
    <main
      className="relative mx-auto flex min-h-full w-full max-w-[430px] flex-col overflow-hidden px-6 pb-10 pt-14 text-white"
      style={{
        background: "radial-gradient(120% 80% at 50% 20%, #6a8570 0%, #516a57 44%, #3a4d40 100%)",
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center animate-fade-up">
        <KeptPageMark size={220} />
        <BrandWord className="mt-8 text-[42px] leading-none text-white" />
        <p className="mt-3 text-[17px] font-medium text-white/90">Scan it. Clean it. Keep it.</p>
        <p className="mt-3 max-w-[280px] text-[15px] leading-6 text-white/70">
          Turn messy receipts and documents into clean, organized files in seconds.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <button
          type="button"
          onClick={start}
          className="w-full rounded-2xl bg-white px-4 py-[16px] text-[16px] font-semibold text-accent-strong"
        >
          Get Started
        </button>
        <p className="text-[12px] text-white/65">
          <Link href="/privacy" className="text-white underline-offset-2 hover:underline">
            Privacy
          </Link>
          <span className="mx-2 text-white/40">·</span>
          <Link href="/terms" className="text-white underline-offset-2 hover:underline">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
