import { CATEGORY_LABEL, type DocCategory, type DocFacts, type KeptDoc } from "@/lib/types";

type ShareCardProps = {
  kind: DocCategory;
  title: string;
  text: string;
  facts: DocFacts;
  thumbnail?: string;
};

export function factsFromClip(
  clip: Pick<KeptDoc, "category" | "title" | "text" | "facts" | "thumbnail">,
): ShareCardProps {
  return {
    kind: clip.category,
    title: clip.title,
    text: clip.text,
    facts: clip.facts,
    thumbnail: clip.thumbnail,
  };
}

export function ShareCard({ kind, title, text, facts, thumbnail }: ShareCardProps) {
  const meta = [
    ...(facts.merchant ? [{ label: facts.merchant, kind: "Store" }] : []),
    ...facts.phones.map((v) => ({ label: v.replace(/\s+/g, " "), kind: "Phone" })),
    ...facts.dates.map((v) => ({ label: v, kind: "Date" })),
    ...facts.emails.map((v) => ({ label: v, kind: "Email" })),
  ];
  const lines = (facts.items ?? []).map((item) => {
    const dollar = item.lastIndexOf("$");
    if (dollar <= 0) return { name: item, price: "" };
    return {
      name: item.slice(0, dollar).replace(/[\s·•¶¤£¢]+$/g, "").trim(),
      price: item.slice(dollar),
    };
  });

  return (
    <article className="overflow-hidden rounded-[18px] border border-rule bg-card">
      {thumbnail ? (
        <img src={thumbnail} alt="" className="max-h-36 w-full object-cover object-top" />
      ) : null}
      <div className="flex flex-col gap-4 p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          {CATEGORY_LABEL[kind]}
        </span>
        <h2 className="text-[24px] font-semibold leading-snug tracking-tight text-ink">{title}</h2>
        {meta.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {meta.map((chip) => (
              <li
                key={`${chip.kind}-${chip.label}`}
                className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] text-accent-strong"
              >
                <span className="text-accent/70">{chip.kind} · </span>
                {chip.label}
              </li>
            ))}
          </ul>
        ) : null}
        {lines.length > 0 ? (
          <ul className="flex flex-col gap-2 border-t border-rule pt-3">
            {lines.map((line) => (
              <li
                key={`${line.name}-${line.price}`}
                className="flex items-baseline justify-between gap-4 text-[14px]"
              >
                <span className="text-ink">{line.name}</span>
                {line.price ? <span className="tabular-nums text-muted">{line.price}</span> : null}
              </li>
            ))}
            {facts.total ? (
              <li className="mt-1 flex items-baseline justify-between gap-4 border-t border-rule pt-2 text-[14px]">
                <span className="font-medium text-ink">
                  {facts.totalIsEstimate ? "About" : "Total"}
                </span>
                <span className="tabular-nums font-medium text-ink">${facts.total}</span>
              </li>
            ) : null}
          </ul>
        ) : facts.total ? (
          <p className="text-[14px] text-ink">
            {facts.totalIsEstimate ? "About" : "Total"} ${facts.total}
          </p>
        ) : null}
        <details className="text-[14px] text-muted">
          <summary className="cursor-pointer select-none">Raw text</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-sans leading-6">{text}</pre>
        </details>
      </div>
    </article>
  );
}
