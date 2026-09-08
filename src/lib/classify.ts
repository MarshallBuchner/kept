import type { DocCategory, DocFacts } from "./types";

export type ClipFacts = DocFacts;
export type ClipKind = DocCategory;

const MERCHANTS: [RegExp, string][] = [
  [/walmart|save money\.?\s*live better/i, "Walmart"],
  [/target\b|expect more\.?\s*pay less/i, "Target"],
  [/marshalls?/i, "Marshalls"],
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

/** Normalize noisy OCR before parsing so totals stay stable across runs. */
export function normalizeOcrText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[|]/g, "I")
    .replace(/\bT[O0]TA[LI1]\b/gi, "TOTAL")
    .replace(/\bSUB\s*T[O0]TA[LI1]\b/gi, "SUBTOTAL")
    .replace(/\bVISA\s*TE[NM]D\b/gi, "VISA TEND")
    .replace(/\b(?:US\s*)?DEBIT\s*TE[NM]D\b/gi, "DEBIT TEND")
    .replace(/\bAMEX\s*TE[NM]D\b/gi, "AMEX TEND")
    .replace(/\bCHANGE\s+DU[EF]\b/gi, "CHANGE DUE")
    .replace(/\bW[AO][LI1]MART\b/gi, "Walmart")
    .replace(/\bTARGE[TI]\b/gi, "Target")
    .replace(/\bMARSHA[LI1]{1,2}S?\b/gi, "Marshalls")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractFacts(text: string): DocFacts {
  const cleaned = normalizeOcrText(text);
  const merchant = findMerchant(cleaned);
  const items = parseReceiptItems(cleaned);
  const priced = items.map((item) => item.price);
  const printedTotal = printedTotalFromText(cleaned);
  const tenderTotal = tenderTotalFromText(cleaned);
  const summed = sumPrices(priced);

  // Prefer printed TOTAL / card tender every time. Never let a partial item
  // sum flip the total between runs when a receipt total is present.
  const total = printedTotal ?? tenderTotal ?? (items.length >= 3 ? summed : undefined);
  const anchor = Number(printedTotal ?? tenderTotal ?? 0);
  const itemSum = Number(summed ?? 0);
  const itemsLikelyIncomplete =
    Boolean(total) &&
    itemSum > 0 &&
    anchor > 0 &&
    itemSum < anchor * 0.82 &&
    Math.abs(anchor - itemSum) >= 1;

  return {
    amounts: unique([...(total ? [total] : []), ...priced]),
    dates: unique(
      cleaned.match(
        /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/gi,
      ) ?? [],
    ),
    phones: unique(
      (cleaned.match(/\(?\s*\d{3}\s*\)?\s*[-.\s]+\s*\d{3}\s*[-.\s]+\s*\d{4}\b/g) ?? []).map(prettyPhone),
    ),
    emails: unique(cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []),
    merchant,
    total,
    totalIsEstimate: Boolean(total) && !printedTotal && !tenderTotal,
    itemsLikelyIncomplete,
    items: items.map((item) => `${item.name} · $${item.price}`),
  };
}

export function titleFromText(text: string): string {
  const cleaned = normalizeOcrText(text);
  const merchant = findMerchant(cleaned);
  if (merchant) return merchant;
  const line =
    cleaned
      .split(/\n/)
      .map((s) => s.trim())
      .find(
        (s) =>
          s.length > 2 &&
          !/^[><|\\/\s]+$/.test(s) &&
          !/save money|live better|survey|feedback|expect more/i.test(s),
      ) ?? "Untitled clip";
  return line.slice(0, 80);
}

export function classify(text: string): DocCategory {
  const cleaned = normalizeOcrText(text);
  const t = cleaned.toLowerCase();
  const scores: Record<DocCategory, number> = {
    receipt: 0,
    invoice: 0,
    note: 0,
    document: 0,
  };

  if (findMerchant(cleaned)) scores.receipt += 4;
  if (
    /\$\s*\d|total|subtotal|tax|visa|mastercard|change due|auth code|cashier|terminal|approval|ref #/.test(
      t,
    )
  ) {
    scores.receipt += 3;
  }
  if (parseReceiptItems(cleaned).length >= 2) scores.receipt += 2;
  if (/invoice|bill to|amount due|net\s*\d+|purchase order|po\s*#|remit/.test(t)) {
    scores.invoice += 4;
  }
  if (/due date|balance due|account number|wire transfer/.test(t)) scores.invoice += 2;
  if (/ingredients|tbsp|tsp\b|preheat|oven|cups?\b|bake |whisk |recipe|serves /.test(t)) {
    scores.note += 3;
  }
  if (/\b\d{3}[-.\s]+\d{3}[-.\s]+\d{4}\b|phone:|email:|linkedin|to-?do|meeting notes/.test(t)) {
    scores.note += 2;
  }
  if (/passport|license|contract|statement|warranty|policy|certificate/.test(t)) {
    scores.document += 3;
  }
  if (scores.receipt + scores.invoice + scores.note === 0) scores.document += 1;

  const ranked = (Object.entries(scores) as [DocCategory, number][]).sort((a, b) => b[1] - a[1]);
  const [kind, score] = ranked[0];
  return score >= 2 ? kind : "document";
}

export function scoreReceiptText(text: string): number {
  const cleaned = normalizeOcrText(text);
  let score = 0;
  if (findMerchant(cleaned)) score += 6;
  if (printedTotalFromText(cleaned)) score += 10;
  if (tenderTotalFromText(cleaned)) score += 6;
  if (/subtotal/i.test(cleaned)) score += 2;
  if (/\btax\b/i.test(cleaned)) score += 1;
  score += Math.min(parseReceiptItems(cleaned).length, 12);
  score += Math.min(cleaned.length / 80, 8);
  return score;
}

const SKIP_LINE =
  /walmart|save money|live better|total|subtotal|tax|approval|terminal|payment|signature|ref #|cashier|change|manager|st#|op#|te#|tr#|phone|coupon|visa|amex|mastercard|debit|philadelphia|bluebell|tend\b|\baid\b|trans id|validation|cartwheel|saved \$|items sold|customer copy|survey|feedback|expect more|pay less|tc#|aac\b|auth#|expires|purchase|regular sale|your redcard/i;

const SECTION_HEADER =
  /^(cleaning supplies|grocery|health|beauty|cosmetics|home|produce|electronics|clothing|apparel)\b/i;

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
  [/\bgl\s*oves\b/i, "Gloves"],
  [/\bgi\s*oves\b/i, "Gloves"],
  [/\bdishlim\b/i, "Dish Liquid"],
  [/\bdual\s*\d*/i, "Dual"],
  [/\bmcc\/?\s*sch\s*pars\b/i, "McCormick Parsley"],
  [/\bmcc\s*sch\s*pars\b/i, "McCormick Parsley"],
  [/\bmccormick\s*pars(?:ley)?\b/i, "McCormick Parsley"],
  [/\bpars(?:ley)?\b/i, "Parsley"],
  [/\blean\s*cuisin\b/i, "Lean Cuisine"],
  [/\bbird\s*subb?\b/i, "Birdseye"],
  [/\badvil\b/i, "Advil"],
];

function parseReceiptItems(text: string): { name: string; price: string }[] {
  const items: { name: string; price: string; qty: number }[] = [];
  const index = new Map<string, number>();
  const lines = stitchSplitItemLines(text.split(/\n/).map((l) => l.trim()).filter(Boolean));

  for (const line of lines) {
    if (line.length < 4 || SKIP_LINE.test(line) || SECTION_HEADER.test(line)) continue;
    // Skip percent-only noise, but keep hyphen prices like "F 2-43".
    if (/%/.test(line) && !/\d{1,3}[.\-–—]\d{2}/.test(line)) continue;

    const recovered = recoverMangledItem(line);
    const structured = parseStructuredItem(line);
    let price = recovered?.price ?? structured?.price ?? priceFromLine(line);
    let name = recovered?.name ?? structured?.name ?? itemNameFromLine(line);

    // Duplicate SKU with garbage price (e.g. "VINYL GLOVES … 32785"): reuse prior price.
    if (name && !isPlausibleItemPrice(price)) {
      const prior = findItemByName(items, index, name);
      if (prior && looksLikeProductCodeLine(line)) {
        prior.qty += 1;
        continue;
      }
      price = undefined;
    }
    if (!price || !name) continue;

    // Dedupe by name only when prices match or one looks like a truncated OCR of the other.
    const nameKey = name.toLowerCase();
    const existingByName = [...index.entries()].find(([key]) => key.startsWith(`${nameKey}|`));
    if (existingByName) {
      const idx = existingByName[1];
      const prior = items[idx];
      if (prior.price === price) {
        prior.qty += 1;
        continue;
      }
      // Prefer the longer/more precise price when OCR drops a leading digit
      // (1.72 vs 11.72), and still count both lines — common for duplicate SKUs.
      if (isTruncatedPricePair(prior.price, price)) {
        prior.price = prior.price.length >= price.length ? prior.price : price;
        prior.qty += 1;
        continue;
      }
    }

    const key = `${nameKey}|${price}`;
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

function findItemByName(
  items: { name: string; price: string; qty: number }[],
  index: Map<string, number>,
  name: string,
) {
  const nameKey = name.toLowerCase();
  const hit = [...index.entries()].find(([key]) => key.startsWith(`${nameKey}|`));
  return hit ? items[hit[1]] : undefined;
}

function looksLikeProductCodeLine(line: string): boolean {
  return /\b\d{8,14}\b/.test(line) || /[A-Za-z].*\d{5,}/.test(line);
}

function isPlausibleItemPrice(price: string | undefined): price is string {
  if (!price) return false;
  const n = Number(price);
  return Number.isFinite(n) && n > 0 && n < 500;
}

/**
 * Rescue common Walmart OCR collapses: broken UPC + hyphen price, or known
 * SKU name with no usable amount.
 */
function recoverMangledItem(line: string): { name: string; price: string } | undefined {
  const parsley =
    line.match(
      /\bmcc\/?\s*sch\s*pars\b.*?[FTNXO]?\s*(\d{1,3})[.\-–—](\d{2})\b/i,
    ) ?? line.match(/\bpars(?:ley)?\b.*?[FTNXO]?\s*(\d{1,3})[.\-–—](\d{2})\b/i);
  if (parsley) {
    return { name: "McCormick Parsley", price: `${parsley[1]}.${parsley[2]}` };
  }

  const named = line.match(
    /^([A-Z][A-Z0-9 /&'\-]{3,}?)\s+(?:\d{6,14}|[\d\s]{2,}|[0o]{1,2}\s*[a-z]{1,3})[:!]?\s+[FTNXO]?\s*(\d{1,3})[.\-–—](\d{2})\s*[A-Za-z;,]?\s*$/i,
  );
  if (named) {
    const name = cleanItemName(named[1]);
    if (name) return { name, price: `${named[2]}.${named[3]}` };
  }

  return undefined;
}

/** OCR often drops a leading digit on a duplicate SKU price (11.72 → 1.72). */
function isTruncatedPricePair(a: string, b: string): boolean {
  if (a === b) return false;
  const [longer, shorter] = a.length >= b.length ? [a, b] : [b, a];
  return longer.length === shorter.length + 1 && longer.slice(1) === shorter;
}

/** Merge "NAME UPC" + next-line-only price into one item line. */
function stitchSplitItemLines(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    const hasUpc = /\b\d{8,14}\b/.test(line);
    const hasPrice = /\d{1,3}\.\d{2}/.test(line) || /\b\d{1,3}[.,\s]\d{2}\s*[A-Za-z]?\s*$/.test(line);
    const nextIsPriceOnly =
      next &&
      /^(?:[A-Za-z]\s*)?\$?\s*\d{1,3}[.,]\d{2}\s*[A-Za-z]?\s*$/.test(next) &&
      !/\b\d{8,14}\b/.test(next);
    if (hasUpc && !hasPrice && nextIsPriceOnly) {
      out.push(`${line} ${next}`);
      i += 1;
      continue;
    }
    out.push(line);
  }
  return out;
}

/** Walmart: NAME UPC PRICE X ; Target-ish: ID NAME FC $PRICE */
function parseStructuredItem(line: string): { name: string; price: string } | undefined {
  // Optional tax flag letter (F/T/N/X/O) between UPC and price — common on Walmart food lines.
  // Also tolerate a colon/bang stuck to the UPC ("…014718: 3.98 X").
  const walmart =
    line.match(
      /^(.+?)\s+(\d{8,14})[!lI:]?\s*(?:[FTNXO]\s*)?(\d{1,3}\.\d{2})\s*[A-Za-z]?\s*$/i,
    ) ??
    // OCR glues flag to price: "... 005210000738 F2.44 O" or "...738F 2.44 O"
    line.match(
      /^(.+?)\s+(\d{8,14})[!lI:]?\s*[FTNXO]?(\d{1,3}\.\d{2})\s*[A-Za-z]?\s*$/i,
    ) ??
    // Hyphen used as decimal: "... F 2-43 ;"
    line.match(
      /^(.+?)\s+(\d{8,14})[!lI:]?\s*(?:[FTNXO]\s*)?(\d{1,3})[.\-–—](\d{2})\s*[A-Za-z;,]?\s*$/i,
    ) ??
    // OCR sometimes drops the decimal: "... 019339700848 1172 X" or "... 11 72 X"
    line.match(
      /^(.+?)\s+(\d{8,14})[!lI:]?\s*(?:[FTNXO]\s*)?(\d{1,3})[.,\s](\d{2})\s*[A-Za-z]?\s*$/i,
    );

  if (walmart) {
    const name = cleanItemName(walmart[1]);
    const price =
      walmart[4] !== undefined
        ? `${walmart[3]}.${walmart[4]}`
        : walmart[3].includes(".")
          ? walmart[3]
          : undefined;
    // If we only got an integer price after a UPC, skip — too unreliable (11 vs 11.72).
    if (!name || !price || !isPlausibleItemPrice(price)) return undefined;
    return { name, price: Number(price).toFixed(2) };
  }

  const target = line.match(
    /^(?:\d{4,12}\s+)?([A-Z][A-Z0-9 /&'\-]{3,}?)\s+(?:FC|T|F|C)?\s*\$?\s*(\d{1,3}\.\d{2})\s*[↓-]?\s*$/i,
  );
  if (target) {
    const name = cleanItemName(target[1]);
    if (!name) return undefined;
    return { name, price: Number(target[2]).toFixed(2) };
  }

  return undefined;
}

function cleanItemName(raw: string): string | undefined {
  let name = raw
    .replace(/[¤£¢©><|%#§]/g, " ")
    .replace(/\b\d{6,14}\b/g, " ")
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
  name = name
    .replace(/\s+/g, " ")
    .replace(/\s*[.:;,]+$/g, "")
    .replace(/^[.:;,\s]+/g, "")
    .replace(/\s+[A-Za-z]$/, "")
    .trim();
  if (!isPlausibleItemName(name)) return undefined;
  return name.slice(0, 36);
}

function priceFromLine(line: string): string | undefined {
  const cleaned = line.replace(/[¤£¢]/g, " ").replace(/[;]+$/g, "").trim();
  const end = cleaned.match(/(\d{1,3})\.(\d{2})\s*[A-Za-z↓]?\s*$/);
  if (end) return `${end[1]}.${end[2]}`;
  // OCR often turns "2.43" into "2-43" on food lines.
  const hyphen = cleaned.match(/(\d{1,3})[-–—](\d{2})\s*[A-Za-z;,]?\s*$/);
  if (hyphen) return `${hyphen[1]}.${hyphen[2]}`;
  const flaggedHyphen = cleaned.match(/[FTNXO]\s*(\d{1,3})[-–—.](\d{2})\b/i);
  if (flaggedHyphen) return `${flaggedHyphen[1]}.${flaggedHyphen[2]}`;
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
  return cleanItemName(
    line
      .replace(/\b\d{6,14}\b/g, " ")
      .replace(/\b\d{4,}\b/g, " ")
      .replace(/\b\d[A-Za-z0-9]{2,}\b/g, " ")
      .replace(/\b[A-Za-z]+[0-9]+\b/g, " ")
      .replace(/\b[FTOXN]\d{3}\b/gi, " ")
      .replace(/\bi[l1]\d{2}[xX]\b/g, " ")
      .replace(/(\d{1,3}[.,:]\d{1,2})\s*%?\s*[A-Za-z↓]?\s*$/g, " "),
  );
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

function moneyInLine(line: string): string | undefined {
  const match =
    line.match(/\$\s*(\d{1,4}\.\d{2})\b/) ??
    line.match(/\b(\d{1,4}\.\d{2})\b(?!\s*%)/) ??
    priceFromLine(line);
  if (!match) return undefined;
  const value = typeof match === "string" ? match : match[1];
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 20000) return undefined;
  return Number(value).toFixed(2);
}

function printedTotalFromText(text: string): string | undefined {
  let subtotal: string | undefined;
  let tax: string | undefined;
  let total: string | undefined;

  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (/sub\s*total/i.test(line)) {
      subtotal = moneyInLine(line) ?? subtotal;
      continue;
    }
    if (/\btax\b/i.test(line) && !/pre-?tax|taxable/i.test(line)) {
      tax = moneyInLine(line) ?? tax;
      continue;
    }
    // Avoid matching "items sold" style noise; require TOTAL near an amount.
    if (/\btotal\b/i.test(line) && !/sub\s*total/i.test(line)) {
      total = moneyInLine(line) ?? total;
    }
  }

  // Global fallback for OCR that smashed TOTAL onto a weird line.
  if (!total) {
    const smashed = text.match(/\bTOTAL\b[^\d]{0,12}(\d{1,4}\.\d{2})\b/i);
    if (smashed) total = Number(smashed[1]).toFixed(2);
  }

  const sub = Number(subtotal);
  const grand = Number(total);
  if (Number.isFinite(grand) && grand > 0) {
    if (Number.isFinite(sub) && sub > 0 && grand < sub * 0.45) {
      // OCR likely grabbed a tiny false TOTAL; prefer subtotal+tax.
    } else {
      return total;
    }
  }
  if (Number.isFinite(sub) && sub > 0) {
    const taxAmount = Number(tax);
    if (Number.isFinite(taxAmount) && taxAmount >= 0) return (sub + taxAmount).toFixed(2);
    return subtotal;
  }
  return undefined;
}

function tenderTotalFromText(text: string): string | undefined {
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (/\b(?:visa|amex|mc|mastercard|debit|us\s*debit|discover)\b.*\b(?:tend|total)?\b/i.test(line) ||
      /\btend\b/i.test(line)) {
      const amount = moneyInLine(line);
      if (amount && Number(amount) >= 1) return amount;
    }
  }
  const smashed = text.match(
    /\b(?:VISA|AMEX|DEBIT|MASTERCARD)\s*(?:TEND)?[^\d]{0,10}(\d{1,4}\.\d{2})\b/i,
  );
  return smashed ? Number(smashed[1]).toFixed(2) : undefined;
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
    if (out.length >= 24) break;
  }
  return out;
}
