import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soft-launch launcher",
  robots: { index: false, follow: false },
};

type StepStatus = "done" | "waiting" | "todo";

const STEPS: ReadonlyArray<{
  href: string;
  title: string;
  detail: string;
  status: StepStatus;
}> = [
  {
    href: "https://ads.tiktok.com/",
    title: "1. TikTok Pixel",
    detail: "Live — DAINOAJC77UDHLL3UCVG in prod JS · Events Manager Connected",
    status: "done",
  },
  {
    href: "https://vercel.com/powr4/kept/settings/environment-variables",
    title: "2. Vercel NEXT_PUBLIC_TIKTOK_PIXEL_ID",
    detail: "Production env wired · baked into current deploy",
    status: "done",
  },
  {
    href: "https://kept-eosin.vercel.app/welcome",
    title: "3. Smoke-test /welcome",
    detail: "200 OK · Get Started fires ViewContent / ClickButton",
    status: "done",
  },
  {
    href: "https://ads.tiktok.com/",
    title: "4. Traffic ads (LPV, TikTok-only)",
    detail: "4 ads submitted — check Ads Manager until Active + spend/LPV",
    status: "waiting",
  },
  {
    href: "https://www.namecheap.com/domains/registration/results/?domain=keptapp.ca",
    title: "5. Buy keptapp.ca (~$11.98/yr)",
    detail: "CIRA: Canadian citizen / PR / corp · parallel with ad review",
    status: "todo",
  },
  {
    href: "https://vercel.com/powr4/kept/settings/domains",
    title: "6. Attach domain on Vercel",
    detail: "Valid + HTTPS → NEXT_PUBLIC_APP_URL=https://keptapp.ca → Redeploy → point ads/bio",
    status: "todo",
  },
];

const STATUS_LABEL: Record<StepStatus, string> = {
  done: "Done",
  waiting: "Waiting",
  todo: "Todo",
};

export default function SoftLaunchLauncherPage() {
  return (
    <main
      className="mx-auto flex min-h-full w-full max-w-[430px] flex-col px-5 pb-12 pt-10 text-white"
      style={{
        background: "radial-gradient(120% 80% at 50% 0%, #6a8570 0%, #516a57 45%, #3a4d40 100%)",
      }}
    >
      <h1 className="text-[28px] font-bold tracking-tight">Kept soft-launch</h1>
      <p className="mt-2 text-[14px] leading-5 text-white/80">
        Remaining: domain buy/attach + ads leaving review. Ads already point at{" "}
        <span className="font-mono text-[12px]">kept-eosin.vercel.app/welcome</span> — never a
        git-preview URL. Marshall-only — not indexed.
      </p>

      <ol className="mt-6 list-none space-y-3 p-0">
        {STEPS.map((step) => (
          <li key={step.title}>
            <a
              href={step.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl bg-white px-4 py-3 text-[15px] font-semibold text-ink"
            >
              <span className="flex items-start justify-between gap-3">
                <span>{step.title}</span>
                <span
                  className={
                    step.status === "done"
                      ? "shrink-0 text-[11px] font-bold uppercase tracking-wide text-accent"
                      : step.status === "waiting"
                        ? "shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted"
                        : "shrink-0 text-[11px] font-bold uppercase tracking-wide text-ink"
                  }
                >
                  {STATUS_LABEL[step.status]}
                </span>
              </span>
              <span className="mt-1 block text-[12px] font-medium text-muted">{step.detail}</span>
            </a>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-[12px] leading-5 text-white/75">
        After DNS:{" "}
        <code className="text-[11px]">
          APP_URL=https://keptapp.ca VERCEL_TOKEN=… ./scripts/wire-soft-launch-env.sh
        </code>
        <br />
        Prove:{" "}
        <code className="text-[11px]">
          PIXEL_ID=DAINOAJC77UDHLL3UCVG ./scripts/verify-soft-launch.sh https://keptapp.ca
        </code>
      </p>
    </main>
  );
}
