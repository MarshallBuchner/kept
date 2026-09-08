"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { feedbackSummary } from "@/lib/feedback";
import { loadDocs, saveDocs } from "@/lib/storage";

export function SettingsScreen() {
  const [count, setCount] = useState(0);
  const [feedback, setFeedback] = useState({ total: 0, confirmed: 0, needsFix: 0 });

  useEffect(() => {
    setCount(loadDocs().length);
    setFeedback(feedbackSummary());
  }, []);

  function clearArchive() {
    if (!window.confirm("Delete every kept document on this device?")) return;
    saveDocs([]);
    setCount(0);
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-4 pt-3 animate-fade-up">
      <header>
        <h1 className="text-center text-[20px] font-semibold">Settings</h1>
      </header>

      <section className="rounded-[18px] bg-card p-5 ring-1 ring-rule">
        <div className="flex items-center gap-3">
          <LogoMark size={48} />
          <div>
            <p className="text-[16px] font-semibold">Kept</p>
            <p className="text-[13px] text-muted">Preferences, account, help</p>
          </div>
        </div>
        <dl className="mt-5 space-y-3 text-[14px]">
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">Documents on device</dt>
            <dd className="font-medium">{count}</dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">Account</dt>
            <dd className="font-medium">Local only</dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">OCR</dt>
            <dd className="font-medium">On-device</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[18px] bg-card p-5 ring-1 ring-rule">
        <h2 className="text-[15px] font-semibold">Beta accuracy checks</h2>
        <p className="mt-2 text-[13px] leading-5 text-muted">
          After each scan, “Looks right” / “Fix this” is saved on this device only.
        </p>
        <dl className="mt-4 space-y-3 text-[14px]">
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">Checks logged</dt>
            <dd className="font-medium">{feedback.total}</dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">Looks right</dt>
            <dd className="font-medium text-accent">{feedback.confirmed}</dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">Needed a fix</dt>
            <dd className="font-medium">{feedback.needsFix}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[18px] bg-card p-5 ring-1 ring-rule">
        <h2 className="text-[15px] font-semibold">Privacy</h2>
        <p className="mt-2 text-[14px] leading-6 text-muted">
          Your information stays private. Photos and extracted text are processed on this device.
        </p>
      </section>

      <section className="rounded-[18px] bg-card p-5 ring-1 ring-rule">
        <h2 className="text-[15px] font-semibold">Coming later</h2>
        <ul className="mt-3 space-y-2 text-[14px] text-muted">
          <li className="flex gap-2"><span className="text-accent">✓</span> Smart naming (AI)</li>
          <li className="flex gap-2"><span className="text-accent">✓</span> Searchable archive (OCR)</li>
          <li className="flex gap-2"><span className="text-accent">○</span> Expense fields & reporting</li>
          <li className="flex gap-2"><span className="text-accent">○</span> Batch scans</li>
        </ul>
      </section>

      <button
        type="button"
        onClick={clearArchive}
        className="rounded-[16px] bg-chip px-4 py-3 text-[14px] font-medium text-danger"
      >
        Clear local archive
      </button>
    </div>
  );
}
