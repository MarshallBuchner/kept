import assert from "node:assert/strict";
import { extractFacts } from "../src/lib/classify";

const cleanWalmart = `Walmart
VINYL GLOVES 019339700848 11.72 X
AJAX DISHLIM 003500049863 2.96 X
ADVIL DUAL18 030573014718 3.98 X
MCC/SCH PARS 005210000738 F 2.44 O
VINYL GLOVES 019339700845 11.72 X
SUBTOTAL 32.82
TAX 1 8.375% 2.54
TOTAL 35.36
VISA TEND 35.36`;

const noisyWalmart = `Walmart?
VINYL GI OVES 019339700848 11.72 X
AJAX DISHLIM 003500049863 2.96 X
ADVI. DUAL18 030573014718! 3.98 X
TAX 1 8.375 % 2.54
TOTAL 35.36
VISA TEND 35.36`;

const partialItemsButTotal = `Vinyl Gloves 1.72
Ajax Dishlim 2.96
Advil : 3.98
TOTAL 35.36
VISA TEND 35.36`;

/** OCR splits price onto the next line + food tax flag glued to amount. */
const splitAndFlagged = `Walmart
VINYL GLOVES 019339700848
11.72 X
AJAX DISHLIM 003500049863 2.96 X
ADVIL : 030573014718 3.98 X
MCC/SCH PARS 005210000738 F2.44 O
VINYL GLOVES 019339700845 1.72 X
SUBTOTAL 32.82
TOTAL 35.36
VISA TEND 35.36`;

/** Exact Full Text OCR from the live Walmart retest that still missed items. */
const liveMangledWalmart = `Walmart 3,<
702-639-1202 Mgr: SHIREEN
5940 LOSEE RD
NORTH LAS VEGAS NV 9081
ST# 04339 OP# 009046 TEH# 45 TR# 08549
VINYL GLOVES 019339700848 11.72 X
AJAX DISHLIM 003500049863 2.96 X
ADVIL DUAL18 030573014718: 3.98 X
MCC/SCH PARS 00 aa F 2-43 ;
VINYL GLOVES 019339700505 32785
8.375 % 2.54
TAX 1 TOTAL 35.36
VISA TEND 35 36`;

const a = extractFacts(cleanWalmart);
assert.equal(a.merchant, "Walmart");
assert.equal(a.total, "35.36");
assert.equal(a.totalIsEstimate, false);
assert.equal(a.itemsLikelyIncomplete, false);
assert.ok((a.items?.length ?? 0) >= 4, `expected >=4 items, got ${a.items?.length}`);
assert.ok(
  a.items?.some((item) => /Vinyl Gloves.*23\.44|Vinyl Gloves × 2/i.test(item)),
  `expected gloves ×2 totaling 23.44, got ${JSON.stringify(a.items)}`,
);
assert.ok(
  a.items?.some((item) => /Parsley.*2\.44/i.test(item)),
  `expected parsley 2.44, got ${JSON.stringify(a.items)}`,
);
assert.ok(
  a.items?.some((item) => /Advil/i.test(item) && !/Advil\s*:/i.test(item)),
  `expected cleaned Advil name, got ${JSON.stringify(a.items)}`,
);

const b = extractFacts(noisyWalmart);
assert.equal(b.total, "35.36");
assert.equal(b.merchant, "Walmart");
assert.equal(b.itemsLikelyIncomplete, true, "noisy sample should flag incomplete items");

const c = extractFacts(partialItemsButTotal);
assert.equal(c.total, "35.36", "must prefer TOTAL over item sum");
assert.equal(c.totalIsEstimate, false);
assert.equal(c.itemsLikelyIncomplete, true);
assert.ok(
  c.items?.some((item) => /^Advil ·/i.test(item) || /^Advil$/i.test(item.split("·")[0].trim())),
  `trailing colon should be stripped from Advil, got ${JSON.stringify(c.items)}`,
);

const d = extractFacts(splitAndFlagged);
assert.equal(d.total, "35.36");
assert.ok(
  d.items?.some((item) => /Vinyl Gloves × 2.*23\.44/i.test(item)),
  `split/truncated gloves should become ×2 @ 23.44, got ${JSON.stringify(d.items)}`,
);
assert.ok(
  d.items?.some((item) => /Parsley.*2\.44/i.test(item)),
  `flag-glued parsley price should parse, got ${JSON.stringify(d.items)}`,
);
assert.ok(
  d.items?.some((item) => /Advil/i.test(item) && !/:/i.test(item)),
  `Advil colon cleaned, got ${JSON.stringify(d.items)}`,
);
const itemSum = (d.items ?? [])
  .map((item) => Number(item.slice(item.lastIndexOf("$") + 1)))
  .reduce((acc, n) => acc + n, 0);
assert.ok(
  Math.abs(itemSum - 32.82) < 0.021,
  `item lines should sum near subtotal 32.82, got ${itemSum} from ${JSON.stringify(d.items)}`,
);

const e = extractFacts(liveMangledWalmart);
assert.equal(e.total, "35.36");
assert.ok(
  e.items?.some((item) => /Vinyl Gloves × 2.*23\.44/i.test(item)),
  `live OCR second gloves should reuse 11.72 → ×2, got ${JSON.stringify(e.items)}`,
);
assert.ok(
  e.items?.some((item) => /Parsley.*2\.43/i.test(item)),
  `live OCR parsley hyphen price 2-43, got ${JSON.stringify(e.items)}`,
);
assert.ok(
  e.items?.some((item) => /Advil/i.test(item)),
  `live OCR Advil with colon after UPC, got ${JSON.stringify(e.items)}`,
);
assert.equal(
  e.itemsLikelyIncomplete,
  false,
  `live mangled sample should recover enough items, got ${JSON.stringify(e.items)}`,
);

const cleanMarshalls = `Marshalls
CARSON VALLEY PLAZA
REGULAR SALE
14-JR DRS/SWTR/JK 115416624 19.99 T
05-KNITWEAR (CASU 114293660 19.99 T
30-DRESSES 116252269 24.99 T
25-LADIES FTWR 115625699 24.00 T
SUBTOTAL 88.97
NV 7.100% Sales Tax 6.32
TOTAL 95.29
AMEX 95.29`;

const noisyMarshalls = `Marshalls
REGULAR SALE
14-JR DRS/SWTR/JK
115416624 19.99 T
)5-KNITWEAR (CASU $ 19.99
30-DRESSES 116252269 24.99 T
25-LADIES FTWR $ 24.00
SUBTOTAL 88.97
TOTAL 95.29
AMEX 95.29`;

const m = extractFacts(cleanMarshalls);
assert.equal(m.merchant, "Marshalls");
assert.equal(m.total, "95.29");
assert.equal(m.itemsLikelyIncomplete, false);
assert.equal(m.items?.length, 4, `expected 4 Marshalls items, got ${JSON.stringify(m.items)}`);
assert.ok(
  m.items?.some((item) => /Dress/i.test(item) && /24\.99/.test(item)),
  `expected 30-Dresses, got ${JSON.stringify(m.items)}`,
);
assert.ok(
  m.items?.some((item) => /Knitwear/i.test(item) && !/\$/.test(item.split("·")[0])),
  `knitwear name should not keep trailing $, got ${JSON.stringify(m.items)}`,
);

const n = extractFacts(noisyMarshalls);
assert.equal(n.total, "95.29");
assert.ok(
  (n.items?.length ?? 0) >= 4,
  `noisy Marshalls should recover 4 items, got ${JSON.stringify(n.items)}`,
);
assert.ok(
  n.items?.some((item) => /^05-Knitwear/i.test(item.split("·")[0].trim())),
  `)5- should become 05-, got ${JSON.stringify(n.items)}`,
);
assert.ok(
  !(n.items ?? []).some((item) => /\$\s*·|Casu \$/.test(item)),
  `trailing $ stripped from names, got ${JSON.stringify(n.items)}`,
);
assert.equal(n.itemsLikelyIncomplete, false);

console.log("receipt extraction regressions passed");
console.log(
  JSON.stringify(
    {
      cleanItems: a.items,
      noisyItems: b.items,
      partialItems: c.items,
      splitItems: d.items,
      liveMangledItems: e.items,
      marshallsClean: m.items,
      marshallsNoisy: n.items,
      partialTotal: c.total,
    },
    null,
    2,
  ),
);
