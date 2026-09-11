import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soft-launch launcher",
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    href: "https://ads.tiktok.com/",
    title: "1. TikTok Ads Manager → create Pixel",
    detail: "Tools → Events Manager → Connect Data Source → Web → Manual Setup",
  },
  {
    href: "https://vercel.com/powr4/kept/settings/environment-variables",
    title: "2. Vercel → set NEXT_PUBLIC_TIKTOK_PIXEL_ID",
    detail: "Production env → Redeploy (or Actions → Wire soft-launch env)",
  },
  {
    href: "https://kept-eosin.vercel.app/welcome",
    title: "3. Smoke-test /welcome",
    detail: "Get Started → CompleteRegistration in TikTok Test Events",
  },
  {
    href: "https://ads.tiktok.com/",
    title: "4. Soft post + Traffic ad",
    detail: "Auction → Traffic → Website → Landing Page View → /welcome",
  },
  {
    href: "https://www.namecheap.com/domains/registration/results/?domain=keptapp.ca",
    title: "5. Buy keptapp.ca (~$11.98/yr)",
    detail: "CIRA: Canadian citizen / PR / corp",
  },
  {
    href: "https://vercel.com/powr4/kept/settings/domains",
    title: "6. Attach domain on Vercel",
    detail: "Then NEXT_PUBLIC_APP_URL=https://keptapp.ca → Redeploy",
  },
] as const;

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
        Open these in order. Ads can run on{" "}
        <span className="font-mono text-[12px]">kept-eosin.vercel.app</span> before the domain is
        live. Marshall-only page — not indexed.
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
              {step.title}
              <span className="mt-1 block text-[12px] font-medium text-muted">{step.detail}</span>
            </a>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-[12px] leading-5 text-white/75">
        Creative: <code className="text-[11px]">docs/soft-launch/creative/tiktok-paper-live-demo-9x16.mp4</code>
        <br />
        Or paste in the agent chat: <code className="text-[11px]">PIXEL_ID=…</code> and{" "}
        <code className="text-[11px]">VERCEL_TOKEN=…</code>
      </p>
    </main>
  );
}
