import type { ClipFacts, ClipKind } from "./types";

const MERCHANTS: [RegExp, string][] = [
  [/walmart/i, "Walmart"],
  [/target\b/i, "Target"],
  [/costco/i, "Costco"],
  [/trader\s*joe/i, "Trader Joe's"],
  [/whole\s*foods/i, "Whole Foods"],
  [/cvs\b/i, "CVS"],
  [/walgreens/i, "Walgreens"],
  [/starbucks/i, "Starbucks"],
  [/mcdonald/i, "McDonald's"],
];

export function findMerchant(text: string): string | undefined {
  for (const [pattern, name] of MERCHANTS) {
    if (pattern.test(text)) return name;
  }
  return undefined;
}

export function extractFacts(text: string): ClipFacts {
  const merchant = findMerchant(text);
  const items = parseReceiptItems(text);
  const priced = items.map((item) => item.price);
  const printedTotal = printedTotalFromText(text);
  const summed = sumPrices(priced);
  const total = printedTotal ?? summed;
  return {
    amounts: unique([...(total ? [total] : []), ...priced]),
    dates: unique(
      text.match(
        /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/gi,
      ) ?? [],
    ),
    phones: unique(
      (text.match(/\(?\s*\d{3}\s*\)?\s*[-.\s]+\s*\d{3}\s*[-.\s]+\s*\d{4}\b/g) ?? []).map(prettyPhone),
    ),
    emails: unique(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []),
    merchant,
    total,
    totalIsEstimate: Boolean(total) && !printedTotal,
    items: items.map((item) => `${item.name} · $${item.price}`),
  };
}

export function titleFromText(text: string): string {
  const merchant = findMerchant(text);
  if (merchant) return merchant;
  const line =
    text
      .split(/\n/)
      .map((s) => s.trim())
      .find((s) => s.length > 2 && !/^[><|\\/\s]+$/.test(s) && !/save money|live better/i.test(s)) ??
    "Untitled clip";
  return line.slice(0, 80);
}

export function classify(text: string): ClipKind {
  const t = text.toLowerCase();
  const scores: Record<Exclude<ClipKind, "other">, number> = {
    receipt: 0,
    event: 0,
    recipe: 0,
    contact: 0,
  };

  if (findMerchant(text)) scores.receipt += 4;
  if (
    /\$\s*\d|total|subtotal|tax|visa|mastercard|change due|auth code|cashier|terminal|approval|ref #/.test(
      t,
    )
  ) {
    scores.receipt += 3;
  }
  if (parseReceiptItems(text).length >= 2) scores.receipt += 2;
  if (/\btickets?\b|gate |row |seat |doors open|rsvp|admission|venue/.test(t)) {
    scores.event += 3;
  }
  if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.test(t)) {
    scores.event += 1;
  }
  if (/ingredients|tbsp|tsp\b|preheat|oven|cups?\b|bake |whisk |recipe|serves /.test(t)) {
    scores.recipe += 3;
  }
  if (/\b\d{3}[-.\s]+\d{3}[-.\s]+\d{4}\b|phone:|email:|linkedin/.test(t) || /@\w+\.\w+/.test(t)) {
    scores.contact += 2;
  }

  const ranked = (Object.entries(scores) as [Exclude<ClipKind, "other">, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const [kind, score] = ranked[0];
  return score >= 2 ? kind : "other";
}

const SKIP_LINE =
  /walmart|save money|live better|total|subtotal|tax|approval|terminal|payment|signature|ref #|cashier|change|manager|st#|op#|te#|tr#|phone|coupon|visa|philadelphia|bluebell|tend\b|\baid\b|trans id|validation/i;

const NAME_FIXES: [RegExp, string][] = [
  [/\bdrbng\b/i, "Dressing"],
  [/\bdrsng\b/i, "Dressing"],
  [/\bdmbel\b/i, "Dumbbell"],
  [/\bsunflnr\b/i, "Sunflower"],
  [/\bsunflwr\b/i, "Sunflower"],
  [/\bpch\b/i, "Pouch"],
  [/\bsssupreme\b/i, "Supreme"],
  [/\bcoleands\b/i, "Cole slaw"],
  [/\bhnymd\b/i, "Honeymaid"],
  [/\bstko\w*plabl/i, "Strawberry"],
  [/\bstko\b/i, ""],
  [/\bsteko\b/i, ""],
];

function parseReceiptItems(text: string): { name: string; price: string }[] {
  const items: { name: string; price: string; qty: number }[] = [];
  const index = new Map<string, number>();
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (line.length < 4 || SKIP_LINE.test(line)) continue;
    const withoutPrice = line.replace(/\s*[A-Z]?\s*\d{1,3}\.\d{1,2}\s*%?\s*$/i, "");
    if (/%/.test(withoutPrice)) continue;
    const price = priceFromLine(line);
    const name = itemNameFromLine(line);
    if (!price || !name) continue;
    const key = `${name.toLowerCase()}|${price}`;
    const existing = index.get(key);
    if (existing !== undefined) {
      items[existing].qty += 1;
      continue;
    }
    index.set(key, items.length);
    items.push({ name, price, qty: 1 });
  }
  return items.map((item) => ({
    name: item.qty > 1 ? `${item.name} × ${item.qty}` : item.name,
    price: item.qty > 1 ? (Number(item.price) * item.qty).toFixed(2) : item.price,
  }));
}

function priceFromLine(line: string): string | undefined {
  const cleaned = line.replace(/[¤£¢]/g, " ");
  const end = cleaned.match(/(\d{1,3})\.(\d{2})\s*[A-Za-z]?\s*$/);
  if (end) return `${end[1]}.${end[2]}`;
  const percent = cleaned.match(/(\d{1,3})\.(\d{1,2})\s*%\s*$/);
  if (percent) return `${percent[1]}.${percent[2].padEnd(2, "0").slice(0, 2)}`;
  const short = cleaned.match(/(\d{1,3})\.(\d)\s*$/);
  if (short) return `${short[1]}.${short[2]}0`;
  const flagged = cleaned.match(/(\d{1,3})[.,:](\d{2})\s*[A-Za-z]\s*$/);
  if (flagged) return `${flagged[1]}.${flagged[2]}`;
  const glued = cleaned.match(/\b[FTOXN](\d)(\d{2})\s+[A-Za-z]\s*$/i);
  if (glued) return `${glued[1]}.${glued[2]}`;
  const iAsOne = cleaned.match(/\bi[l1](\d{2})[xX]\s*$/);
  if (iAsOne) return `11.${iAsOne[1]}`;
  return undefined;
}

function itemNameFromLine(line: string): string | undefined {
  let name = line
    .replace(/[¤£¢©><|%#§]/g, " ")
    .replace(/\b\d{6,14}\b/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/\b\d[A-Za-z0-9]{2,}\b/g, " ")
    .replace(/\b[A-Za-z]+[0-9]+\b/g, " ")
    .replace(/\b[FTOXN]\d{3}\b/gi, " ")
    .replace(/\bi[l1]\d{2}[xX]\b/g, " ")
    .replace(/(\d{1,3}[.,:]\d{1,2})\s*%?\s*[A-Za-z]?\s*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, replacement] of NAME_FIXES) {
    name = name.replace(pattern, replacement);
  }
  name = name.replace(/\b[A-Za-z]{3,}\b/g, (word) => {
    if (word !== word.toUpperCase()) return word;
    return word.charAt(0) + word.slice(1).toLowerCase();
  });
  for (const [pattern, replacement] of NAME_FIXES) {
    name = name.replace(pattern, replacement);
  }
  name = name.replace(/\s+/g, " ").replace(/\s+[A-Za-z]$/, "").trim();
  if (!isPlausibleItemName(name)) return undefined;
  return name.slice(0, 36);
}

function isPlausibleItemName(name: string): boolean {
  const letters = (name.match(/[A-Za-z]/g) ?? []).length;
  const digits = (name.match(/\d/g) ?? []).length;
  if (letters < 5) return false;
  if (digits > letters) return false;
  if (/[%#]/.test(name)) return false;
  const tokens = name.split(/\s+/);
  const junk = tokens.filter((token) => /[A-Za-z]/.test(token) && /\d/.test(token)).length;
  if (junk >= 2) return false;
  const words = name
    .replace(/^\d+(?:\.\d+)?\s+/, "")
    .split(/\s+/)
    .filter((t) => /[A-Za-z]{3,}/.test(t));
  if (words.length < 1) return false;
  if (/^\d/.test(name) && words.length < 2) {
    return /^[A-Za-z]{4,}$/.test(words[0] ?? "");
  }
  return true;
}

function prettyPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value.replace(/\s+/g, " ").trim();
}

function printedTotalFromText(text: string): string | undefined {
  let subtotal: string | undefined;
  let tax: string | undefined;
  let total: string | undefined;
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (/subtotal/i.test(line)) {
      subtotal = priceFromLine(line) ?? subtotal;
      continue;
    }
    if (/^\s*tax\b/i.test(line) || (/\btax\b/i.test(line) && /\$/.test(line))) {
      tax = line.match(/\$\s*(\d{1,3}\.\d{2})/)?.[1] ?? priceFromLine(line) ?? tax;
      continue;
    }
    if (/\btotal\b/i.test(line)) {
      total = priceFromLine(line) ?? total;
    }
  }
  const sub = Number(subtotal);
  const grand = Number(total);
  if (Number.isFinite(grand) && grand > 5 && !(Number.isFinite(sub) && grand < sub * 0.5)) {
    return total;
  }
  if (Number.isFinite(sub) && sub > 0) {
    const taxAmount = Number(tax);
    if (Number.isFinite(taxAmount) && taxAmount > 0) return (sub + taxAmount).toFixed(2);
    return subtotal;
  }
  return undefined;
}

function sumPrices(priced: string[]): string | undefined {
  if (priced.length === 0) return undefined;
  const sum = priced.reduce((acc, value) => acc + Number(value), 0);
  if (!Number.isFinite(sum) || sum <= 0) return undefined;
  return sum.toFixed(2);
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    out.push(key);
    if (out.length >= 8) break;
  }
  return out;
}
