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
 *      Or paste the key body (GitHub Actions):
 *        export ASC_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----…'
 *
 * Optional overrides:
 *   ASC_APP_ID             (default: 6811619551 — Kept Scan)
 *   ASC_GROUP_ID           (default: 22382931 — Kept Pro)
 *   ASC_BASE_TERRITORY     (default: CAN for CA$ prices)
 *   ASC_PRIVACY_URL        (default: https://kept-eosin.vercel.app/privacy)
 *   ASC_REVIEW_SCREENSHOT  (default: docs/ios/screenshots/iap-review-paywall.png)
 *
 * Also upserts: group localizations, app privacy URL, review notes, review screenshots,
 * and subscription territory availability (all storefronts + new territories).
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
const PRIVACY_URL =
  process.env.ASC_PRIVACY_URL || "https://kept-eosin.vercel.app/privacy";
const REVIEW_NOTE =
  process.env.ASC_REVIEW_NOTE ||
  "Open Settings → Kept Pro, or hit the paywall after the free limit. Buy uses Apple IAP (not Stripe). Restore Purchases is on the paywall and in Settings.";
const SCREENSHOT_PATH = path.resolve(
  process.env.ASC_REVIEW_SCREENSHOT ||
    "docs/ios/screenshots/iap-review-paywall.png",
);
const DRY = process.argv.includes("--dry-run");

const PRODUCTS = [
  {
    productId: "ca.keptapp.app.pro.monthly",
    name: "Kept Pro Monthly",
    period: "ONE_MONTH",
    displayName: "Kept Pro Monthly",
    description: "Unlimited scans and PDF exports, billed monthly.",
    customerPrice: "2.99",
    groupLevel: 1,
  },
  {
    productId: "ca.keptapp.app.pro.yearly",
    name: "Kept Pro Yearly",
    period: "ONE_YEAR",
    displayName: "Kept Pro Yearly",
    description: "Unlimited scans and PDF exports, billed yearly. Best value.",
    customerPrice: "19.99",
    groupLevel: 1,
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
  let pem = process.env.ASC_PRIVATE_KEY?.trim() || "";
  if (pem) {
    // GitHub secrets often store literal \n — normalize to real newlines
    pem = pem.replace(/\\n/g, "\n");
    if (!pem.includes("BEGIN")) {
      // Allow base64-encoded .p8 contents
      pem = Buffer.from(pem, "base64").toString("utf8");
    }
  } else {
    const keyPath = requireEnv("ASC_PRIVATE_KEY_PATH");
    pem = fs.readFileSync(path.resolve(keyPath), "utf8");
  }

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
    const currentLevel = found.attributes?.groupLevel;
    if (currentLevel != null && currentLevel !== product.groupLevel) {
      console.log(
        `  groupLevel ${currentLevel} → ${product.groupLevel} (same-level crossgrade with sibling plan)`,
      );
      if (!DRY) {
        try {
          await asc(token, "PATCH", `/v1/subscriptions/${found.id}`, {
            data: {
              type: "subscriptions",
              id: found.id,
              attributes: { groupLevel: product.groupLevel },
            },
          });
        } catch (err) {
          console.warn(
            `  WARN: could not set groupLevel (${err.message}). Set both plans to level 1 in Connect UI.`,
          );
        }
      }
    }
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
        groupLevel: product.groupLevel,
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

async function ensureGroupLocalizations(token) {
  console.log("\n— subscription group localizations");
  const list = await asc(
    token,
    "GET",
    `/v1/subscriptionGroups/${GROUP_ID}/subscriptionGroupLocalizations?limit=50`,
  );
  const have = new Set((list.data ?? []).map((l) => l.attributes?.locale));
  for (const locale of ["en-CA", "en-US"]) {
    if (have.has(locale)) {
      console.log(`  group localization ${locale} ok`);
      continue;
    }
    console.log(`  adding group localization ${locale}…`);
    if (DRY) continue;
    await asc(token, "POST", "/v1/subscriptionGroupLocalizations", {
      data: {
        type: "subscriptionGroupLocalizations",
        attributes: {
          locale,
          name: "Kept Pro",
        },
        relationships: {
          subscriptionGroup: {
            data: { type: "subscriptionGroups", id: GROUP_ID },
          },
        },
      },
    });
  }
}

async function ensureAppPrivacyUrl(token) {
  console.log("\n— app privacy policy URL");
  const infos = await asc(token, "GET", `/v1/apps/${APP_ID}/appInfos?limit=10`);
  const info = (infos.data ?? [])[0];
  if (!info) {
    console.warn("  WARN: no appInfos — set privacy URL in Connect UI");
    return;
  }
  const locs = await asc(
    token,
    "GET",
    `/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`,
  );
  for (const loc of locs.data ?? []) {
    const locale = loc.attributes?.locale;
    const current = loc.attributes?.privacyPolicyUrl;
    if (current === PRIVACY_URL) {
      console.log(`  ${locale}: privacy URL ok`);
      continue;
    }
    console.log(`  ${locale}: set privacy URL → ${PRIVACY_URL}`);
    if (DRY) continue;
    try {
      await asc(token, "PATCH", `/v1/appInfoLocalizations/${loc.id}`, {
        data: {
          type: "appInfoLocalizations",
          id: loc.id,
          attributes: { privacyPolicyUrl: PRIVACY_URL },
        },
      });
    } catch (err) {
      console.warn(
        `  WARN: could not PATCH ${locale} privacy URL (${err.message}). Set in Connect UI.`,
      );
    }
  }
}

async function uploadBinary(uploadOperations, bytes) {
  for (const op of uploadOperations ?? []) {
    const headers = {};
    for (const h of op.requestHeaders ?? []) {
      headers[h.name] = h.value;
    }
    const start = op.offset ?? 0;
    const end = start + (op.length ?? bytes.length);
    const chunk = bytes.subarray(start, end);
    const res = await fetch(op.url, {
      method: op.method || "PUT",
      headers,
      body: chunk,
    });
    if (!res.ok) {
      throw new Error(`upload ${op.method} ${op.url} → ${res.status}`);
    }
  }
}

async function ensureReviewScreenshot(token, subscriptionId) {
  if (!subscriptionId) return;
  if (!fs.existsSync(SCREENSHOT_PATH)) {
    console.warn(`  WARN: screenshot missing at ${SCREENSHOT_PATH}`);
    return;
  }

  // Skip if one already linked
  try {
    const existingShot = await asc(
      token,
      "GET",
      `/v1/subscriptions/${subscriptionId}/appStoreReviewScreenshot`,
    );
    if (existingShot.data?.id) {
      console.log(`  review screenshot already linked (${existingShot.data.id})`);
      return;
    }
  } catch {
    // 404 = none yet
  }

  const bytes = fs.readFileSync(SCREENSHOT_PATH);
  const fileName = path.basename(SCREENSHOT_PATH);
  const fileSize = bytes.length;
  const checksum = crypto.createHash("md5").update(bytes).digest("hex");

  console.log(`  uploading review screenshot ${fileName} (${fileSize} bytes)…`);
  if (DRY) return;

  const created = await asc(token, "POST", "/v1/subscriptionAppStoreReviewScreenshots", {
    data: {
      type: "subscriptionAppStoreReviewScreenshots",
      attributes: { fileName, fileSize },
      relationships: {
        subscription: {
          data: { type: "subscriptions", id: subscriptionId },
        },
      },
    },
  });

  const shotId = created.data.id;
  // Prefer attributes.uploadOperations (ASC returns them on create)
  const ops = created.data.attributes?.uploadOperations ?? [];
  if (!Array.isArray(ops) || ops.length === 0) {
    throw new Error(
      `review screenshot create returned no uploadOperations (id=${shotId}). Retry or upload in Connect UI.`,
    );
  }
  await uploadBinary(ops, bytes);

  await asc(token, "PATCH", `/v1/subscriptionAppStoreReviewScreenshots/${shotId}`, {
    data: {
      type: "subscriptionAppStoreReviewScreenshots",
      id: shotId,
      attributes: {
        uploaded: true,
        sourceFileChecksum: checksum,
      },
    },
  });
  console.log(`  review screenshot committed (${shotId})`);
}

async function ensureReviewNote(token, subscriptionId) {
  if (!subscriptionId) return;
  console.log("  setting review note…");
  if (DRY) return;
  try {
    await asc(token, "PATCH", `/v1/subscriptions/${subscriptionId}`, {
      data: {
        type: "subscriptions",
        id: subscriptionId,
        attributes: {
          reviewNote: REVIEW_NOTE,
        },
      },
    });
    console.log("  review note ok");
  } catch (err) {
    console.warn(`  WARN: could not set review note (${err.message})`);
  }
}

/** Cache of all App Store territories (id = territory code, e.g. CAN, USA). */
let cachedTerritories = null;
async function listAllTerritories(token) {
  if (cachedTerritories) return cachedTerritories;
  const out = [];
  let path = "/v1/territories?limit=200";
  while (path) {
    const page = await asc(token, "GET", path);
    for (const t of page.data ?? []) {
      if (t.id) out.push({ type: "territories", id: t.id });
    }
    const next = page.links?.next;
    path = next ? next.replace("https://api.appstoreconnect.apple.com", "") : null;
  }
  cachedTerritories = out;
  return out;
}

/**
 * Ensure the subscription is available in all storefronts (incl. new territories).
 * Without this, API-created products can stay unavailable for sandbox buys.
 */
async function ensureAvailability(token, subscriptionId) {
  if (!subscriptionId) return;

  try {
    const existing = await asc(
      token,
      "GET",
      `/v1/subscriptions/${subscriptionId}/subscriptionAvailability?include=availableTerritories&limit[availableTerritories]=50`,
    );
    if (existing.data?.id) {
      const inNew = existing.data.attributes?.availableInNewTerritories;
      const included = (existing.included ?? []).filter(
        (r) => r.type === "territories",
      ).length;
      // Heuristic: already configured if availableInNewTerritories and at least one territory
      if (inNew === true && included > 0) {
        console.log(
          `  availability ok (id=${existing.data.id}, territories≈${included}+, newTerritories=true)`,
        );
        return;
      }
      console.log(
        `  availability exists but incomplete (newTerritories=${inNew}, territories≈${included}) — re-posting all territories…`,
      );
    }
  } catch (err) {
    if (err.status && err.status !== 404) {
      console.warn(`  WARN: could not read availability (${err.message})`);
    } else {
      console.log("  no availability yet — setting all territories…");
    }
  }

  const territories = await listAllTerritories(token);
  if (territories.length === 0) {
    console.warn("  WARN: no territories returned — set Availability in Connect UI");
    return;
  }

  console.log(
    `  setting availability: ${territories.length} territories, availableInNewTerritories=true…`,
  );
  if (DRY) return;

  try {
    await asc(token, "POST", "/v1/subscriptionAvailabilities", {
      data: {
        type: "subscriptionAvailabilities",
        attributes: { availableInNewTerritories: true },
        relationships: {
          subscription: {
            data: { type: "subscriptions", id: subscriptionId },
          },
          availableTerritories: { data: territories },
        },
      },
    });
    console.log("  availability ok");
  } catch (err) {
    console.warn(
      `  WARN: could not set availability (${err.message}). Set Availability → All Countries in Connect UI.`,
    );
  }
}

async function main() {
  console.log("== Kept Pro ASC IAP upsert ==");
  console.log(`app=${APP_ID} group=${GROUP_ID} territory=${BASE_TERRITORY}`);
  console.log(`privacy=${PRIVACY_URL}`);
  console.log(`screenshot=${SCREENSHOT_PATH}`);
  if (DRY) console.log("DRY RUN — no writes");

  const token = makeToken();

  // Sanity: app exists
  const app = await asc(token, "GET", `/v1/apps/${APP_ID}`);
  console.log(`app: ${app.data?.attributes?.name} (${app.data?.attributes?.bundleId})`);

  await ensureGroupLocalizations(token);
  await ensureAppPrivacyUrl(token);

  const existing = await listGroupSubscriptions(token);
  console.log(`\ngroup has ${existing.length} subscription(s)`);

  for (const product of PRODUCTS) {
    console.log(`\n— ${product.productId}`);
    const sub = await ensureSubscription(token, existing, product);
    const id = sub?.id;
    await ensureLocalization(token, id, product);
    await ensurePrice(token, id, product);
    await ensureAvailability(token, id);
    await ensureReviewNote(token, id);
    await ensureReviewScreenshot(token, id);
  }

  console.log(`\nDone.
Still required in App Store Connect / on device:
  1. Subscription group Privacy Policy URL = ${PRIVACY_URL} (Connect UI on Kept Pro group)
  2. Paid Apps agreement Active (Business → Agreements)
  3. Sandbox tester (Users and Access → Sandbox)
  4. Confirm storefront price equalizations if needed
  5. Merge IAP PR → Xcode Cloud Deploy to TestFlight (or Mac Archive build 5+)
  6. Sandbox buy (Apple sheet, not Stripe) + Restore → Submit with IAP
`);
}

main().catch((err) => {
  console.error(err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
