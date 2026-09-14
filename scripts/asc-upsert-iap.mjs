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
 * subscription territory availability (all storefronts + new territories), and
 * storefront price equalizations from the CAN base price.
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

/** Paginate current subscription prices; return Set of pricePoint ids already applied. */
async function listCurrentPricePointIds(token, subscriptionId) {
  const ids = new Set();
  let path =
    `/v1/subscriptions/${subscriptionId}/prices?limit=200&include=subscriptionPricePoint,territory`;
  while (path) {
    const page = await asc(token, "GET", path);
    for (const price of page.data ?? []) {
      const rel = price.relationships?.subscriptionPricePoint?.data?.id;
      if (rel) ids.add(rel);
    }
    const next = page.links?.next;
    path = next ? next.replace("https://api.appstoreconnect.apple.com", "") : null;
  }
  return ids;
}

async function postSubscriptionPrice(token, subscriptionId, pricePointId) {
  await asc(token, "POST", "/v1/subscriptionPrices", {
    data: {
      type: "subscriptionPrices",
      attributes: { startDate: null },
      relationships: {
        subscription: {
          data: { type: "subscriptions", id: subscriptionId },
        },
        subscriptionPricePoint: {
          data: { type: "subscriptionPricePoints", id: pricePointId },
        },
      },
    },
  });
}

/**
 * Apply Apple’s equalized (prefer adjusted) price points for every storefront.
 * Needed so sandbox / Review outside CAN can buy without manual “Add all equalizations”.
 * @returns {{ ok: boolean, reason?: string }}
 */
async function ensureEqualizedPrices(token, subscriptionId, basePricePointId) {
  async function fetchEqs(kind) {
    let path =
      `/v1/subscriptionPricePoints/${basePricePointId}/${kind}` +
      `?limit=200&include=territory`;
    const eqs = [];
    while (path) {
      const page = await asc(token, "GET", path);
      eqs.push(...(page.data ?? []));
      const next = page.links?.next;
      path = next ? next.replace("https://api.appstoreconnect.apple.com", "") : null;
    }
    return eqs;
  }

  let used = "adjustedEqualizations";
  let eqs = [];
  try {
    eqs = await fetchEqs("adjustedEqualizations");
  } catch (err) {
    console.warn(
      `  WARN: adjustedEqualizations failed (${err.message}); trying equalizations…`,
    );
  }

  if (eqs.length === 0) {
    used = "equalizations";
    try {
      eqs = await fetchEqs("equalizations");
    } catch (err2) {
      console.warn(
        `  WARN: could not list equalizations (${err2.message}). Add equalizations in Connect UI.`,
      );
      return { ok: false, reason: `equalizations list failed: ${err2.message}` };
    }
  }

  if (eqs.length === 0) {
    console.warn("  WARN: no equalizations returned — set other storefront prices in Connect UI");
    return { ok: false, reason: "no equalizations returned" };
  }

  console.log(`  equalizations (${used}): ${eqs.length} storefront price points`);
  if (DRY) return { ok: true };

  const have = await listCurrentPricePointIds(token, subscriptionId);
  let added = 0;
  let skipped = 0;
  let failed = 0;
  for (const pp of eqs) {
    if (!pp?.id) continue;
    if (have.has(pp.id)) {
      skipped += 1;
      continue;
    }
    try {
      await postSubscriptionPrice(token, subscriptionId, pp.id);
      have.add(pp.id);
      added += 1;
    } catch (err) {
      failed += 1;
      if (failed <= 3) {
        console.warn(
          `  WARN: could not set equalized price ${pp.id} (${err.message})`,
        );
      }
    }
  }
  console.log(
    `  equalizations applied: +${added}, already ${skipped}, failed ${failed}`,
  );
  // Allow a few transient conflicts; fail if many storefronts couldn't be priced.
  if (failed > 5 && failed > eqs.length * 0.1) {
    return {
      ok: false,
      reason: `too many equalization failures (${failed}/${eqs.length})`,
    };
  }
  return { ok: true };
}

async function ensurePrice(token, subscriptionId, product) {
  if (!subscriptionId) return { ok: false, reason: "missing subscription id" };
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
    return {
      ok: false,
      reason: `no ${BASE_TERRITORY} price point for ${product.customerPrice}`,
    };
  }

  console.log(
    `  using pricePoint ${match.id} (customerPrice=${match.attributes?.customerPrice})`,
  );
  if (DRY) {
    console.log("  (dry-run) skip base price + equalizations");
    return { ok: true };
  }

  const have = await listCurrentPricePointIds(token, subscriptionId);
  if (have.has(match.id)) {
    console.log(`  ${BASE_TERRITORY} price already set`);
  } else {
    await postSubscriptionPrice(token, subscriptionId, match.id);
    console.log(`  set ${BASE_TERRITORY} price`);
  }

  return ensureEqualizedPrices(token, subscriptionId, match.id);
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

function assertReviewScreenshotReady() {
  if (!fs.existsSync(SCREENSHOT_PATH)) {
    throw new Error(
      `ASC review screenshot missing at ${SCREENSHOT_PATH}. Add docs/ios/screenshots/iap-review-paywall.png (~1290×2796).`,
    );
  }
  const bytes = fs.readFileSync(SCREENSHOT_PATH);
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
    throw new Error(`ASC review screenshot is not a PNG: ${SCREENSHOT_PATH}`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  // Match verify-iap-ready: phone portrait, not a tall scroll strip
  if (
    width < 1170 ||
    width > 1320 ||
    height < 2000 ||
    height > 3200 ||
    height / width > 2.5
  ) {
    throw new Error(
      `ASC review screenshot ${width}×${height} is not App Review–ready (use ~1290×2796 iPhone).`,
    );
  }
  return { bytes, width, height };
}

async function ensureReviewScreenshot(token, subscriptionId) {
  if (!subscriptionId) return { ok: false, reason: "missing subscription id" };

  let bytes;
  let width;
  let height;
  try {
    ({ bytes, width, height } = assertReviewScreenshotReady());
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    return { ok: false, reason: err.message };
  }

  // Replace any existing linked screenshot so a bad Connect asset cannot stick forever.
  try {
    const existingShot = await asc(
      token,
      "GET",
      `/v1/subscriptions/${subscriptionId}/appStoreReviewScreenshot`,
    );
    if (existingShot.data?.id) {
      const oldId = existingShot.data.id;
      console.log(`  removing existing review screenshot (${oldId}) before re-upload…`);
      if (!DRY) {
        await asc(token, "DELETE", `/v1/subscriptionAppStoreReviewScreenshots/${oldId}`);
      }
    }
  } catch (err) {
    // 404 = none yet; other errors still attempt upload
    if (err.status && err.status !== 404) {
      console.warn(`  WARN: could not read/delete existing screenshot (${err.message})`);
    }
  }

  const fileName = path.basename(SCREENSHOT_PATH);
  const fileSize = bytes.length;
  const checksum = crypto.createHash("md5").update(bytes).digest("hex");

  console.log(
    `  uploading review screenshot ${fileName} (${width}×${height}, ${fileSize} bytes)…`,
  );
  if (DRY) return { ok: true };

  try {
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
    return { ok: true };
  } catch (err) {
    console.error(`  ERROR: review screenshot upload failed (${err.message})`);
    return { ok: false, reason: err.message };
  }
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
 * @returns {{ ok: boolean, reason?: string }}
 */
async function ensureAvailability(token, subscriptionId) {
  if (!subscriptionId) return { ok: false, reason: "missing subscription id" };

  const territories = await listAllTerritories(token);
  if (territories.length === 0) {
    console.warn("  WARN: no territories returned — set Availability in Connect UI");
    return { ok: false, reason: "no territories returned" };
  }

  let existingId = null;
  let existingTerritoryCount = 0;
  let inNew = false;

  try {
    const existing = await asc(
      token,
      "GET",
      `/v1/subscriptions/${subscriptionId}/subscriptionAvailability?fields[subscriptionAvailabilities]=availableInNewTerritories`,
    );
    existingId = existing.data?.id ?? null;
    inNew = existing.data?.attributes?.availableInNewTerritories === true;
    if (existingId) {
      // Paginate related territories (include limit is capped)
      let path = `/v1/subscriptionAvailabilities/${existingId}/availableTerritories?limit=200`;
      while (path) {
        const page = await asc(token, "GET", path);
        existingTerritoryCount += (page.data ?? []).length;
        const next = page.links?.next;
        path = next ? next.replace("https://api.appstoreconnect.apple.com", "") : null;
      }
    }
  } catch (err) {
    if (err.status && err.status !== 404) {
      console.warn(`  WARN: could not read availability (${err.message})`);
    } else {
      console.log("  no availability yet — setting all territories…");
    }
  }

  const complete =
    Boolean(existingId) &&
    inNew &&
    existingTerritoryCount >= Math.floor(territories.length * 0.9);

  if (complete) {
    console.log(
      `  availability ok (id=${existingId}, territories=${existingTerritoryCount}, newTerritories=true)`,
    );
    return { ok: true };
  }

  if (existingId) {
    console.log(
      `  availability incomplete (newTerritories=${inNew}, territories=${existingTerritoryCount}/${territories.length}) — updating…`,
    );
  }

  console.log(
    `  setting availability: ${territories.length} territories, availableInNewTerritories=true…`,
  );
  if (DRY) return { ok: true };

  try {
    if (existingId) {
      // Replace territory list + flip availableInNewTerritories via PATCH relationships + attributes
      try {
        await asc(token, "PATCH", `/v1/subscriptionAvailabilities/${existingId}`, {
          data: {
            type: "subscriptionAvailabilities",
            id: existingId,
            attributes: { availableInNewTerritories: true },
          },
        });
      } catch (err) {
        console.warn(`  WARN: could not PATCH availability attributes (${err.message})`);
      }
      await asc(
        token,
        "PATCH",
        `/v1/subscriptionAvailabilities/${existingId}/relationships/availableTerritories`,
        { data: territories },
      );
      console.log("  availability updated");
      return { ok: true };
    }

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
    return { ok: true };
  } catch (err) {
    console.warn(
      `  WARN: could not set availability (${err.message}). Set Availability → All Countries in Connect UI.`,
    );
    return { ok: false, reason: err.message };
  }
}

async function main() {
  console.log("== Kept Pro ASC IAP upsert ==");
  console.log(`app=${APP_ID} group=${GROUP_ID} territory=${BASE_TERRITORY}`);
  console.log(`privacy=${PRIVACY_URL}`);
  console.log(`screenshot=${SCREENSHOT_PATH}`);
  if (DRY) console.log("DRY RUN — no writes");

  // Fail fast before touching ASC if review asset is wrong
  try {
    const { width, height } = assertReviewScreenshotReady();
    console.log(`screenshot ok: ${width}×${height}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const token = makeToken();

  // Sanity: app exists
  const app = await asc(token, "GET", `/v1/apps/${APP_ID}`);
  console.log(`app: ${app.data?.attributes?.name} (${app.data?.attributes?.bundleId})`);

  await ensureGroupLocalizations(token);
  await ensureAppPrivacyUrl(token);

  const existing = await listGroupSubscriptions(token);
  console.log(`\ngroup has ${existing.length} subscription(s)`);

  const hardFailures = [];

  for (const product of PRODUCTS) {
    console.log(`\n— ${product.productId}`);
    const sub = await ensureSubscription(token, existing, product);
    const id = sub?.id;
    if (!id && !DRY) {
      hardFailures.push(`${product.productId}: subscription missing after ensure`);
      continue;
    }
    await ensureLocalization(token, id, product);
    const price = await ensurePrice(token, id, product);
    if (price && price.ok === false) {
      hardFailures.push(`${product.productId}: price/equalizations — ${price.reason}`);
    }
    const avail = await ensureAvailability(token, id);
    if (avail && avail.ok === false) {
      hardFailures.push(`${product.productId}: availability — ${avail.reason}`);
    }
    await ensureReviewNote(token, id);
    const shot = await ensureReviewScreenshot(token, id);
    if (shot && shot.ok === false) {
      hardFailures.push(`${product.productId}: review screenshot — ${shot.reason}`);
    }
  }

  console.log(`\nDone.
Still required in App Store Connect / on device:
  1. Subscription group Privacy Policy URL = ${PRIVACY_URL} (Connect UI on Kept Pro group)
  2. Paid Apps agreement Active (Business → Agreements)
  3. Sandbox tester (Users and Access → Sandbox)
  4. Merge IAP PR → Xcode Cloud Deploy to TestFlight (or Mac Archive build 5+)
  5. Sandbox buy (Apple sheet, not Stripe) + Restore → Submit with IAP
`);

  if (hardFailures.length && !DRY) {
    console.error("\nASC upsert incomplete — fix before relying on sandbox buys:");
    for (const f of hardFailures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
