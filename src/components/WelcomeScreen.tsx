"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandWord, LogoMark } from "@/components/Logo";
import { setOnboarded } from "@/lib/storage";

export function WelcomeScreen() {
  const router = useRouter();
  const [dot, setDot] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setDot((d) => (d + 1) % 4), 2200);
    return () => window.clearInterval(id);
  }, []);

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
        <p className="mt-3 max-w-[260px] text-[15px] leading-6 text-muted">
          Turn everyday paper into a cleaner, simpler life.
        </p>
      </div>

      <div className="flex flex-col items-center gap-8 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i === dot ? "bg-accent" : "bg-rule"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={start}
          className="w-full rounded-2xl bg-accent px-4 py-[16px] text-[16px] font-semibold text-white"
        >
          Get Started
        </button>
        <button type="button" onClick={start} className="text-[14px] font-medium text-accent">
          Sign In
        </button>
      </div>
    </main>
  );
}
