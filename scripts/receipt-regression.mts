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

const a = extractFacts(cleanWalmart);
assert.equal(a.merchant, "Walmart");
assert.equal(a.total, "35.36");
assert.equal(a.totalIsEstimate, false);
assert.ok((a.items?.length ?? 0) >= 4, `expected >=4 items, got ${a.items?.length}`);

const b = extractFacts(noisyWalmart);
assert.equal(b.total, "35.36");
assert.equal(b.merchant, "Walmart");

const c = extractFacts(partialItemsButTotal);
assert.equal(c.total, "35.36", "must prefer TOTAL over item sum");
assert.equal(c.totalIsEstimate, false);

console.log("receipt extraction regressions passed");
console.log(
  JSON.stringify(
    {
      cleanItems: a.items,
      noisyItems: b.items,
      partialTotal: c.total,
    },
    null,
    2,
  ),
);
