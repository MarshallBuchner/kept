import { BrandWord, LogoMark } from "@/components/Logo";
import { ShareCard } from "@/components/ShareCard";
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
      <main className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-4 bg-paper px-5 py-16">
        <LogoMark size={56} />
        <p className="text-[28px] font-semibold text-ink">This card is missing.</p>
        <p className="text-[14px] text-muted">The link may be incomplete. Ask them to send it again.</p>
        <Link href="/" className="text-[14px] font-medium text-accent">
          Make your own in Kept
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-8 bg-paper px-5 py-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <BrandWord className="text-[22px]" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          {CATEGORY_LABEL[payload.k]}
        </p>
      </header>
      <ShareCard
        kind={payload.x.length > 20 ? classify(payload.x) : payload.k}
        title={payload.x.length > 20 ? titleFromText(payload.x) : payload.t}
        text={payload.x}
        facts={payload.x.length > 20 ? extractFacts(payload.x) : payload.f}
      />
      <p className="text-[14px] text-muted">
        Someone sent you the extracted bit of a document — not the image.{" "}
        <Link href="/" className="font-medium text-accent">
          Drop your own
        </Link>
        .
      </p>
    </main>
  );
}
