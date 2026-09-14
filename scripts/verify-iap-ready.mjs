#!/usr/bin/env node
/**
 * Repo-side IAP ship readiness check.
 * Exit 0 = code/docs/artifacts ready for Marshall's Connect + Archive steps.
 * Does NOT prove Connect products, sandbox purchase, or App Review submit.
 *
 * Usage: node scripts/verify-iap-ready.mjs
 *        npm run ios:iap:verify
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const MONTHLY = "ca.keptapp.app.pro.monthly";
const YEARLY = "ca.keptapp.app.pro.yearly";
const PROD = "https://kept-eosin.vercel.app";

const checks = [];
function ok(name, detail = "") {
  checks.push({ name, pass: true, detail });
}
function fail(name, detail) {
  checks.push({ name, pass: false, detail });
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

// --- Files ---
const requiredFiles = [
  "src/lib/iap.ts",
  "src/lib/checkout.ts",
  "src/lib/platform.ts",
  "src/components/PaywallSheet.tsx",
  "src/components/SettingsScreen.tsx",
  "src/components/IapEntitlementSync.tsx",
  "scripts/asc-upsert-iap.mjs",
  "scripts/ios-iap-sync.sh",
  "scripts/marshall-iap-next.sh",
  "docs/ios/SHIP_NOW.md",
  "docs/ios/CONNECT_IAP.md",
  "docs/ios/MAC.md",
  "docs/ios/screenshots/iap-review-paywall.png",
  "ios/App/App/Products.storekit",
  "ios/App/App/PrivacyInfo.xcprivacy",
  "ios/App/ci_scripts/ci_post_clone.sh",
  "ios/App/ci_scripts/ci_pre_xcodebuild.sh",
  ".github/workflows/asc-upsert-iap.yml",
  ".github/workflows/verify-iap-ready.yml",
  "capacitor.config.ts",
];
for (const rel of requiredFiles) {
  if (exists(rel)) ok(`file:${rel}`);
  else fail(`file:${rel}`, "missing");
}

// --- Product IDs ---
const iap = exists("src/lib/iap.ts") ? read("src/lib/iap.ts") : "";
const storekit = exists("ios/App/App/Products.storekit")
  ? read("ios/App/App/Products.storekit")
  : "";
const asc = exists("scripts/asc-upsert-iap.mjs")
  ? read("scripts/asc-upsert-iap.mjs")
  : "";
for (const id of [MONTHLY, YEARLY]) {
  if (iap.includes(id) && storekit.includes(id) && asc.includes(id)) {
    ok(`productId:${id}`, "iap.ts + Products.storekit + asc-upsert");
  } else {
    fail(
      `productId:${id}`,
      `missing in ${[!iap.includes(id) && "iap.ts", !storekit.includes(id) && "storekit", !asc.includes(id) && "asc"].filter(Boolean).join(", ")}`,
    );
  }
}

// --- Native Stripe gate ---
const checkout = exists("src/lib/checkout.ts") ? read("src/lib/checkout.ts") : "";
const platform = exists("src/lib/platform.ts") ? read("src/lib/platform.ts") : "";
if (platform.includes("isNativeIOS") && checkout.includes("isNativeIOS")) {
  ok("stripe-gate", "checkout uses isNativeIOS");
} else {
  fail("stripe-gate", "checkout/platform missing isNativeIOS gate");
}
if (checkout.includes("purchaseProIap")) {
  ok("checkout-iap-path", "checkout calls purchaseProIap");
} else {
  fail("checkout-iap-path", "checkout.ts must call purchaseProIap on native");
}

// --- package scripts + Capgo dep ---
const pkg = exists("package.json") ? read("package.json") : "";
for (const script of ["ios:iap:verify", "ios:iap:asc", "ios:iap:sync", "ios:iap:next"]) {
  if (pkg.includes(`"${script}"`)) ok(`npm-script:${script}`);
  else fail(`npm-script:${script}`, "missing in package.json");
}
if (pkg.includes("@capgo/native-purchases")) ok("dep:@capgo/native-purchases");
else fail("dep:@capgo/native-purchases", "missing from package.json");
if (pkg.includes("@capacitor/app")) ok("dep:@capacitor/app");
else fail("dep:@capacitor/app", "needed for foreground entitlement re-sync");

const spm = exists("ios/App/CapApp-SPM/Package.swift")
  ? read("ios/App/CapApp-SPM/Package.swift")
  : "";
if (/native-purchases|NativePurchases/i.test(spm)) {
  ok("spm:capgo-native-purchases");
} else {
  fail("spm:capgo-native-purchases", "CapApp-SPM Package.swift missing Capgo dep");
}

// --- Active entitlement guard + quiet sync ---
if (iap.includes("findActiveKeptEntitlement") || iap.includes("isActive")) {
  ok("iap-active-guard", "entitlement reads check isActive / expiration");
} else {
  fail("iap-active-guard", "iap.ts should prefer isActive for iOS subscriptions");
}
if (iap.includes("trackPaid: false") || iap.includes("trackPaid?: boolean")) {
  ok("iap-quiet-sync", "sync path can skip paid analytics");
} else {
  fail("iap-quiet-sync", "syncProFromStoreKit must not re-fire paid on every launch");
}
const entitlementSync = exists("src/components/IapEntitlementSync.tsx")
  ? read("src/components/IapEntitlementSync.tsx")
  : "";
if (entitlementSync.includes("appStateChange")) {
  ok("iap-foreground-sync", "re-syncs on app foreground");
} else {
  fail("iap-foreground-sync", "IapEntitlementSync should listen for appStateChange");
}
if (
  entitlementSync.includes("transactionUpdated") &&
  (iap.includes("handleStoreKitTransactionUpdate") ||
    entitlementSync.includes("syncProFromStoreKit"))
) {
  ok("iap-transaction-updates", "listens for Capgo transactionUpdated");
} else {
  fail(
    "iap-transaction-updates",
    "IapEntitlementSync should listen for NativePurchases transactionUpdated",
  );
}
if (iap.includes("emptyEntitlementStreak") || iap.includes("emptyEntitlement")) {
  ok("iap-clear-guard", "avoids clearing Pro on a single empty entitlement read");
} else {
  fail("iap-clear-guard", "syncProFromStoreKit should not clear Pro on first empty read");
}

// --- ASC upsert covers availability + equalizations ---
if (asc.includes("subscriptionAvailabilities") || asc.includes("ensureAvailability")) {
  ok("asc-availability", "upsert sets territory availability");
} else {
  fail("asc-availability", "asc-upsert-iap.mjs should POST subscriptionAvailabilities");
}
if (
  asc.includes("ensureEqualizedPrices") ||
  asc.includes("adjustedEqualizations") ||
  asc.includes("/equalizations")
) {
  ok("asc-price-equalizations", "upsert applies storefront price equalizations");
} else {
  fail(
    "asc-price-equalizations",
    "asc-upsert-iap.mjs should apply equalizations after base CAN price",
  );
}

// --- Repo Terms/Privacy IAP copy (in addition to live fetch) ---
const termsBlob = exists("src/app/terms/page.tsx") ? read("src/app/terms/page.tsx") : "";
const privacyBlob = exists("src/app/privacy/page.tsx")
  ? read("src/app/privacy/page.tsx")
  : "";
if (/App Store|Apple ID|auto-renew/i.test(termsBlob)) {
  ok("repo-terms-iap", "terms page mentions App Store billing");
} else {
  fail("repo-terms-iap", "src/app/terms/page.tsx missing App Store billing copy");
}
if (/App Store|In-App|Apple ID/i.test(privacyBlob)) {
  ok("repo-privacy-iap", "privacy page mentions App Store billing");
} else {
  fail("repo-privacy-iap", "src/app/privacy/page.tsx missing App Store billing copy");
}

// --- Restore / manage ---
const paywall = exists("src/components/PaywallSheet.tsx")
  ? read("src/components/PaywallSheet.tsx")
  : "";
const settings = exists("src/components/SettingsScreen.tsx")
  ? read("src/components/SettingsScreen.tsx")
  : "";
if (paywall.includes("Restore purchases") && settings.includes("Restore purchases")) {
  ok("restore-ui", "paywall + settings");
} else {
  fail("restore-ui", "Restore purchases missing on paywall and/or settings");
}
// Guideline 3.1.2 subscription disclosure on native paywall
if (
  /auto-renew/i.test(paywall) &&
  /24 hours/i.test(paywall) &&
  /Terms of Use \(EULA\)/.test(paywall) &&
  /Privacy Policy/.test(paywall) &&
  /renewal price/i.test(paywall)
) {
  ok("paywall-312-disclosure", "auto-renew, renewal price, EULA + Privacy Policy");
} else {
  fail(
    "paywall-312-disclosure",
    "PaywallSheet missing Guideline 3.1.2 disclosure (auto-renew, renewal price, Terms of Use (EULA), Privacy Policy)",
  );
}
if (asc.includes("assertReviewScreenshotReady") || asc.includes("readUInt32BE(16)")) {
  ok("asc-screenshot-gate", "ASC upsert validates review screenshot size");
} else {
  fail("asc-screenshot-gate", "asc-upsert-iap.mjs should hard-fail bad/missing review screenshots");
}
if (
  iap.includes("manageProSubscriptions") &&
  (paywall.includes("manageProSubscriptions") || settings.includes("manageProSubscriptions"))
) {
  ok("manage-subscription", "wired");
} else {
  fail("manage-subscription", "manageProSubscriptions not wired");
}
if (
  iap.includes("syncProFromStoreKit") &&
  exists("src/components/IapEntitlementSync.tsx") &&
  read("src/app/layout.tsx").includes("IapEntitlementSync")
) {
  ok("iap-entitlement-sync", "launch sync wired");
} else {
  fail("iap-entitlement-sync", "syncProFromStoreKit / IapEntitlementSync missing");
}

// --- Capgo StoreKit API surface used by iap.ts ---
for (const method of [
  "isBillingSupported",
  "getProducts",
  "purchaseProduct",
  "restorePurchases",
  "getPurchases",
  "manageSubscriptions",
]) {
  if (iap.includes(`NativePurchases.${method}`)) ok(`capgo:${method}`);
  else fail(`capgo:${method}`, "missing NativePurchases call in iap.ts");
}
if (iap.includes("PURCHASE_TYPE.SUBS")) ok("capgo:PURCHASE_TYPE.SUBS");
else fail("capgo:PURCHASE_TYPE.SUBS", "iap.ts must request subscription products");

// --- StoreKit config: monthly+yearly same subscription level (crossgrades) ---
const storekitRel = "ios/App/App/Products.storekit";
if (exists(storekitRel)) {
  const sk = read(storekitRel);
  const levels = [...sk.matchAll(/"groupNumber"\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  if (levels.length >= 2 && levels.every((n) => n === levels[0])) {
    ok("storekit-group-level", `same level ${levels[0]} for ${levels.length} products`);
  } else {
    fail(
      "storekit-group-level",
      `expected identical groupNumber for all subs, got ${levels.join(",") || "none"}`,
    );
  }
}

// --- Review screenshot dimensions (IAP review prefers phone-sized PNG) ---
const shotRel = "docs/ios/screenshots/iap-review-paywall.png";
if (exists(shotRel)) {
  const buf = fs.readFileSync(path.join(root, shotRel));
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    // Accept common portrait phone widths; height should be ≤ ~3× width (not a tall scroll strip)
    if (w >= 1170 && w <= 1320 && h >= 2000 && h <= 3200 && h / w <= 2.5) {
      ok("review-screenshot-size", `${w}×${h}`);
    } else {
      fail(
        "review-screenshot-size",
        `${w}×${h} — use ~1290×2796 (iPhone) for Connect IAP review`,
      );
    }
  } else {
    fail("review-screenshot-size", "not a PNG");
  }
}

// --- Capacitor server ---
const cap = exists("capacitor.config.ts") ? read("capacitor.config.ts") : "";
if (cap.includes("kept-eosin.vercel.app")) {
  ok("capacitor-server", "points at production Vercel");
} else {
  fail("capacitor-server", "capacitor.config.ts missing kept-eosin.vercel.app");
}

// --- Build number ---
const pbx = exists("ios/App/App.xcodeproj/project.pbxproj")
  ? read("ios/App/App.xcodeproj/project.pbxproj")
  : "";
const versions = [...pbx.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map((m) =>
  Number(m[1]),
);
if (versions.length && versions.every((v) => v >= 5)) {
  ok("build-number", `CURRENT_PROJECT_VERSION >= 5 (${versions.join(",")})`);
} else {
  fail("build-number", `expected >= 5, got ${versions.join(",") || "none"}`);
}

const pbxRel = "ios/App/App.xcodeproj/project.pbxproj";
const pbxFull = exists(pbxRel) ? read(pbxRel) : pbx;
if (pbxFull.includes("com.apple.InAppPurchase") && pbxFull.includes("enabled = 1")) {
  ok("iap-capability", "com.apple.InAppPurchase enabled in project");
} else {
  fail("iap-capability", "SystemCapabilities com.apple.InAppPurchase missing in project.pbxproj");
}
if (pbxFull.includes("StoreKit.framework")) {
  ok("storekit-framework", "StoreKit.framework linked");
} else {
  fail("storekit-framework", "StoreKit.framework not linked in project.pbxproj");
}
const schemeRel = "ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme";
if (exists(schemeRel) && read(schemeRel).includes("Products.storekit")) {
  ok("storekit-scheme", "Run scheme references Products.storekit");
} else {
  fail("storekit-scheme", "App.xcscheme missing StoreKitConfigurationFileReference");
}

// --- Live production (best-effort; skip on Mac sync with SKIP_LIVE_FETCH=1) ---
if (process.env.SKIP_LIVE_FETCH === "1") {
  ok("prod-fetch", "skipped (SKIP_LIVE_FETCH=1)");
} else {
  try {
    const terms = await fetch(`${PROD}/terms`).then((r) => r.text());
    if (/App Store|Apple ID|auto-renew/i.test(terms)) ok("prod-terms-iap");
    else fail("prod-terms-iap", "terms page missing App Store billing copy");
    const privacy = await fetch(`${PROD}/privacy`).then((r) => r.text());
    if (/App Store|In-App|Apple ID/i.test(privacy)) ok("prod-privacy-iap");
    else fail("prod-privacy-iap", "privacy page missing App Store billing copy");
  } catch (err) {
    fail("prod-fetch", String(err.message || err));
  }
}

// --- Report ---
const failed = checks.filter((c) => !c.pass);
const passed = checks.filter((c) => c.pass);
console.log("== Kept IAP repo readiness ==");
for (const c of checks) {
  console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}
console.log(`\n${passed.length} passed, ${failed.length} failed`);
console.log(`
Human gates still required (not checked here):
  1. GitHub secrets ASC_ISSUER_ID / ASC_KEY_ID / ASC_PRIVATE_KEY
  2. Actions → ASC upsert Kept Pro IAP → Run workflow
     (or Connect UI: monthly+yearly + review screenshots)
  3. Paid Apps agreement Active
  4. Sandbox tester
  5. Mac Archive (build 5+) → TestFlight
  6. Sandbox purchase shows Apple sheet (not Stripe) + Restore
  7. Submit for Review with IAP attached
See docs/ios/SHIP_NOW.md
`);

process.exit(failed.length ? 1 : 0);
