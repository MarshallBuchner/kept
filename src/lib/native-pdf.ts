import { registerPlugin } from "@capacitor/core";
import type { KeptDoc } from "@/lib/types";

const NativePdf = registerPlugin<{
  exportReceipt(options: {
    title: string;
    lines: string[];
    image?: string;
  }): Promise<{ completed: boolean }>;
}>("KeptPdf");

export function exportNativePdf(doc: KeptDoc, mode: "itemized" | "photo", notes: string) {
  return NativePdf.exportReceipt({
    title: doc.facts.merchant || doc.title,
    lines: [
      doc.facts.dates[0] || doc.createdAt.slice(0, 10),
      ...(mode === "itemized" ? doc.facts.items || [] : []),
      `Total: ${doc.facts.total ? `$${doc.facts.total}` : "—"}`,
      ...(mode === "itemized" && notes.trim() ? ["Notes", notes.trim()] : []),
      ...(mode === "itemized" && doc.tags.length ? [`Tags: ${doc.tags.join(", ")}`] : []),
    ],
    ...(mode === "photo" ? { image: doc.image || doc.thumbnail } : {}),
  });
}
