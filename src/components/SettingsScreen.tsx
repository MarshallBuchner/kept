"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { loadDocs, saveDocs } from "@/lib/storage";

export function SettingsScreen() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(loadDocs().length);
  }, []);

  function clearArchive() {
    if (!window.confirm("Delete every kept document on this device?")) return;
    saveDocs([]);
    setCount(0);
  }

  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-8 animate-fade-up">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">Preferences stay local. No account required.</p>
      </header>

      <section className="rounded-3xl border border-rule bg-card p-5">
        <div className="flex items-center gap-3">
          <LogoMark size={44} />
          <div>
            <p className="font-semibold text-ink">Kept</p>
            <p className="text-sm text-muted">Private screenshot inbox</p>
          </div>
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Documents on device</dt>
            <dd className="font-medium">{count}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Storage</dt>
            <dd className="font-medium">This browser only</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">OCR</dt>
            <dd className="font-medium">On-device</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl border border-rule bg-card p-5">
        <h2 className="text-sm font-semibold">Privacy</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Photos and extracted text never leave your device for processing. Share links only
          encode the text you choose to send.
        </p>
      </section>

      <section className="rounded-3xl border border-rule bg-card p-5">
        <h2 className="text-sm font-semibold">Coming later</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>• Smart naming</li>
          <li>• Expense fields & reporting</li>
          <li>• Batch scans</li>
        </ul>
      </section>

      <button
        type="button"
        onClick={clearArchive}
        className="rounded-2xl border border-rule bg-card px-4 py-3 text-sm font-medium text-red-700"
      >
        Clear local archive
      </button>
    </div>
  );
}
