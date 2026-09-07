export const CLIP_KINDS = ["event", "receipt", "recipe", "contact", "other"] as const;

export type ClipKind = (typeof CLIP_KINDS)[number];

export type ClipFacts = {
  amounts: string[];
  dates: string[];
  phones: string[];
  emails: string[];
  merchant?: string;
  total?: string;
  totalIsEstimate?: boolean;
  items?: string[];
};

export type Clip = {
  id: string;
  createdAt: string;
  kind: ClipKind;
  title: string;
  text: string;
  thumbnail: string;
  facts: ClipFacts;
};

export const KIND_LABEL: Record<ClipKind, string> = {
  event: "Event",
  receipt: "Receipt",
  recipe: "Recipe",
  contact: "Contact",
  other: "Note",
};
