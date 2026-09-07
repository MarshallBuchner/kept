"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandWord, LogoMark } from "@/components/Logo";
import { setOnboarded } from "@/lib/storage";

export function WelcomeScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  function start() {
    setOnboarded();
    router.replace("/");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-between bg-gradient-to-b from-accent-soft via-paper to-paper px-6 py-12">
      <div className={`flex flex-col items-center text-center ${ready ? "animate-fade-up" : ""}`}>
        <LogoMark size={72} />
        <BrandWord className="mt-6 text-4xl font-semibold" />
        <p className="mt-3 max-w-xs text-base leading-7 text-muted">
          Turn everyday paper into a cleaner, simpler life.
        </p>
      </div>

      <div className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <button
          type="button"
          onClick={start}
          className="rounded-2xl bg-accent px-4 py-3.5 text-sm font-semibold text-white"
        >
          Get Started
        </button>
        <button
          type="button"
          onClick={start}
          className="rounded-2xl px-4 py-3 text-sm font-medium text-accent"
        >
          Continue without account
        </button>
        <p className="text-center text-xs text-muted">
          Your information stays private on this device.
        </p>
      </div>
    </main>
  );
}
