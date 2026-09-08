export const DOC_CATEGORIES = ["receipt", "invoice", "note", "document"] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const DOC_TAGS = ["Tax", "Work", "Personal", "Travel"] as const;

export type DocTag = (typeof DOC_TAGS)[number];

export type DocFacts = {
  amounts: string[];
  dates: string[];
  phones: string[];
  emails: string[];
  merchant?: string;
  total?: string;
  totalIsEstimate?: boolean;
  items?: string[];
};

export type ReviewStatus = "unreviewed" | "confirmed" | "needs_fix";

export type KeptDoc = {
  id: string;
  createdAt: string;
  category: DocCategory;
  title: string;
  text: string;
  thumbnail: string;
  image: string;
  facts: DocFacts;
  tags: DocTag[];
  notes: string;
  reviewStatus?: ReviewStatus;
  reviewedAt?: string;
};

/** @deprecated Prefer KeptDoc — kept for share payload compatibility during migration */
export type Clip = KeptDoc & { kind: DocCategory };
export type ClipKind = DocCategory;
export type ClipFacts = DocFacts;

export const CATEGORY_LABEL: Record<DocCategory, string> = {
  receipt: "Receipt",
  invoice: "Invoice",
  note: "Note",
  document: "Document",
};

export const KIND_LABEL = CATEGORY_LABEL;
