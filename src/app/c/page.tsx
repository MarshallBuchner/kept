import { ShareCard } from "@/components/ShareCard";
import { classify, extractFacts, titleFromText } from "@/lib/classify";
import { decodeShare } from "@/lib/share";
import { KIND_LABEL } from "@/lib/types";
import Link from "next/link";

export default async function CardPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string | string[] }>;
}) {
  const raw = (await searchParams).d;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const payload = token ? decodeShare(token) : null;

  if (!payload || !(payload.k in KIND_LABEL)) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-5 py-16">
        <p className="font-serif text-3xl text-ink">This card is missing.</p>
        <p className="text-sm text-muted">The link may be incomplete. Ask them to send it again.</p>
        <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
          Make your own in Kept
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-5 py-12">
      <header className="flex items-end justify-between">
        <p className="font-serif text-2xl tracking-tight text-ink">Kept</p>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{KIND_LABEL[payload.k]}</p>
      </header>
      <ShareCard
        kind={payload.x.length > 20 ? classify(payload.x) : payload.k}
        title={payload.x.length > 20 ? titleFromText(payload.x) : payload.t}
        text={payload.x}
        facts={payload.x.length > 20 ? extractFacts(payload.x) : payload.f}
      />
      <p className="text-sm text-muted">
        Someone sent you the extracted bit of a screenshot — not the image.{" "}
        <Link href="/" className="text-accent underline-offset-4 hover:underline">
          Drop your own
        </Link>
        .
      </p>
    </main>
  );
}
