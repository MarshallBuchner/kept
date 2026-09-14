#!/usr/bin/env node
/**
 * Upsert Kept Pro monthly/yearly subscriptions in App Store Connect via API.
 *
 * Prerequisites (Users and Access → Integrations → App Store Connect API):
 *   1. Create a key with Admin or App Manager
 *   2. Download the .p8 once
 *   3. Export:
 *        export ASC_ISSUER_ID='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
 *        export ASC_KEY_ID='XXXXXXXXXX'
 *        export ASC_PRIVATE_KEY_PATH="$HOME/AuthKey_XXXXXXXXXX.p8"
 *
 * Optional overrides:
 *   ASC_APP_ID          (default: 6811619551 — Kept Scan)
 *   ASC_GROUP_ID        (default: 22382931 — Kept Pro)
 *   ASC_BASE_TERRITORY  (default: CAN for CA$ prices)
 *
 * Usage:
 *   node scripts/asc-upsert-iap.mjs
 *   node scripts/asc-upsert-iap.mjs --dry-run
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const APP_ID = process.env.ASC_APP_ID || "6811619551";
const GROUP_ID = process.env.ASC_GROUP_ID || "22382931";
const BASE_TERRITORY = process.env.ASC_BASE_TERRITORY || "CAN";
const DRY = process.argv.includes("--dry-run");

const PRODUCTS = [
  {
    productId: "ca.keptapp.app.pro.monthly",
    name: "Kept Pro Monthly",
    period: "ONE_MONTH",
    displayName: "Kept Pro Monthly",
    description: "Unlimited scans and PDF exports, billed monthly.",
    customerPrice: "2.99",
  },
  {
    productId: "ca.keptapp.app.pro.yearly",
    name: "Kept Pro Yearly",
    period: "ONE_YEAR",
    displayName: "Kept Pro Yearly",
    description: "Unlimited scans and PDF exports, billed yearly. Best value.",
    customerPrice: "19.99",
  },
];

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Missing ${name}. See script header for setup.`);
    process.exit(1);
  }
  return v;
}

function makeToken() {
  const issuerId = requireEnv("ASC_ISSUER_ID");
  const keyId = requireEnv("ASC_KEY_ID");
  const keyPath = requireEnv("ASC_PRIVATE_KEY_PATH");
  const pem = fs.readFileSync(path.resolve(keyPath), "utf8");

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: issuerId,
      iat: now,
      exp: now + 15 * 60,
      aud: "appstoreconnect-v1",
    }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const key = crypto.createPrivateKey(pem);
  const sig = crypto.sign("sha256", Buffer.from(data), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${data}.${sig.toString("base64url")}`;
}

async function asc(token, method, urlPath, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`${method} ${urlPath} → ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function listGroupSubscriptions(token) {
  const json = await asc(
    token,
    "GET",
    `/v1/subscriptionGroups/${GROUP_ID}/subscriptions?limit=50`,
  );
  return json.data ?? [];
}

async function ensureSubscription(token, existing, product) {
  const found = existing.find(
    (s) => s.attributes?.productId === product.productId,
  );
  if (found) {
    console.log(`OK exists ${product.productId} (id=${found.id})`);
    return found;
  }

  console.log(`Creating ${product.productId}…`);
  if (DRY) {
    console.log("  (dry-run) skip create");
    return null;
  }

  const created = await asc(token, "POST", "/v1/subscriptions", {
    data: {
      type: "subscriptions",
      attributes: {
        name: product.name,
        productId: product.productId,
        subscriptionPeriod: product.period,
        familySharable: false,
      },
      relationships: {
        group: {
          data: { type: "subscriptionGroups", id: GROUP_ID },
        },
      },
    },
  });
  console.log(`  created id=${created.data.id}`);
  return created.data;
}

async function ensureLocalization(token, subscriptionId, product) {
  if (!subscriptionId) return;
  const list = await asc(
    token,
    "GET",
    `/v1/subscriptions/${subscriptionId}/subscriptionLocalizations?limit=50`,
  );
  const locales = (list.data ?? []).map((l) => l.attributes?.locale);
  for (const locale of ["en-CA", "en-US"]) {
    if (locales.includes(locale)) {
      console.log(`  localization ${locale} ok`);
      continue;
    }
    console.log(`  adding localization ${locale}…`);
    if (DRY) continue;
    await asc(token, "POST", "/v1/subscriptionLocalizations", {
      data: {
        type: "subscriptionLocalizations",
        attributes: {
          locale,
          name: product.displayName,
          description: product.description,
        },
        relationships: {
          subscription: {
            data: { type: "subscriptions", id: subscriptionId },
          },
        },
      },
    });
  }
}

async function ensurePrice(token, subscriptionId, product) {
  if (!subscriptionId) return;
  console.log(
    `  price: looking up ${BASE_TERRITORY} ≈ ${product.customerPrice}…`,
  );

  // Paginate price points for base territory
  let path =
    `/v1/subscriptions/${subscriptionId}/pricePoints` +
    `?filter[territory]=${BASE_TERRITORY}&limit=200`;
  let match = null;
  while (path) {
    const page = await asc(token, "GET", path);
    for (const pp of page.data ?? []) {
      const customer = String(pp.attributes?.customerPrice ?? "");
      if (customer === product.customerPrice || customer === `${product.customerPrice}00`) {
        match = pp;
        break;
      }
      // Also accept 2.99 vs 2.990
      if (Number(customer) === Number(product.customerPrice)) {
        match = pp;
        break;
      }
    }
    if (match) break;
    const next = page.links?.next;
    path = next ? next.replace("https://api.appstoreconnect.apple.com", "") : null;
  }

  if (!match) {
    console.warn(
      `  WARN: no ${BASE_TERRITORY} price point for ${product.customerPrice}. Set price in Connect UI.`,
    );
    return;
  }

  console.log(
    `  using pricePoint ${match.id} (customerPrice=${match.attributes?.customerPrice})`,
  );
  if (DRY) return;

  // Current prices
  const current = await asc(
    token,
    "GET",
    `/v1/subscriptions/${subscriptionId}/prices?limit=50&include=subscriptionPricePoint,territory`,
  );
  const already = (current.data ?? []).some((price) => {
    const rel = price.relationships?.subscriptionPricePoint?.data?.id;
    return rel === match.id;
  });
  if (already) {
    console.log("  price already set");
    return;
  }

  // Set base territory price immediately; equalizations can be done in UI or follow-up
  await asc(token, "POST", "/v1/subscriptionPrices", {
    data: {
      type: "subscriptionPrices",
      attributes: {
        startDate: null,
      },
      relationships: {
        subscription: {
          data: { type: "subscriptions", id: subscriptionId },
        },
        subscriptionPricePoint: {
          data: { type: "subscriptionPricePoints", id: match.id },
        },
      },
    },
  });
  console.log(`  set ${BASE_TERRITORY} price`);
  console.log(
    "  NOTE: In Connect, use “Add all equalizations” (or price edit) for other storefronts.",
  );
}

async function main() {
  console.log("== Kept Pro ASC IAP upsert ==");
  console.log(`app=${APP_ID} group=${GROUP_ID} territory=${BASE_TERRITORY}`);
  if (DRY) console.log("DRY RUN — no writes");

  const token = makeToken();

  // Sanity: app exists
  const app = await asc(token, "GET", `/v1/apps/${APP_ID}`);
  console.log(`app: ${app.data?.attributes?.name} (${app.data?.attributes?.bundleId})`);

  const existing = await listGroupSubscriptions(token);
  console.log(`group has ${existing.length} subscription(s)`);

  for (const product of PRODUCTS) {
    console.log(`\n— ${product.productId}`);
    const sub = await ensureSubscription(token, existing, product);
    const id = sub?.id;
    await ensureLocalization(token, id, product);
    await ensurePrice(token, id, product);
  }

  console.log(`\nDone.
Next in App Store Connect (still required):
  1. Review Information screenshot for each product
     docs/ios/screenshots/iap-review-paywall.png
  2. Paid Apps agreement Active
  3. Sandbox tester
  4. Archive build 5+ → TestFlight sandbox buy → Submit with IAP
`);
}

main().catch((err) => {
  console.error(err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
