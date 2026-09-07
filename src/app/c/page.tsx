import { ShareCard } from "@/components/ShareCard";
import { BrandWord, LogoMark } from "@/components/Logo";
import { classify, extractFacts, titleFromText } from "@/lib/classify";
import { decodeShare } from "@/lib/share";
import { CATEGORY_LABEL } from "@/lib/types";
import Link from "next/link";

export default async function CardPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string | string[] }>;
}) {
  const raw = (await searchParams).d;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const payload = token ? decodeShare(token) : null;

  if (!payload || !(payload.k in CATEGORY_LABEL)) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-lg flex-col gap-4 bg-paper px-5 py-16">
        <LogoMark size={48} />
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
          This card is missing.
        </p>
        <p className="text-sm text-muted">The link may be incomplete. Ask them to send it again.</p>
        <Link href="/" className="text-sm font-medium text-accent">
          Make your own in Kept
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col gap-8 bg-paper px-5 py-12">
      <header className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <BrandWord className="text-2xl font-semibold" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          {CATEGORY_LABEL[payload.k]}
        </p>
      </header>
      <ShareCard
        kind={payload.x.length > 20 ? classify(payload.x) : payload.k}
        title={payload.x.length > 20 ? titleFromText(payload.x) : payload.t}
        text={payload.x}
        facts={payload.x.length > 20 ? extractFacts(payload.x) : payload.f}
      />
      <p className="text-sm text-muted">
        Someone sent you the extracted bit of a document — not the image.{" "}
        <Link href="/" className="font-medium text-accent">
          Drop your own
        </Link>
        .
      </p>
    </main>
  );
}
