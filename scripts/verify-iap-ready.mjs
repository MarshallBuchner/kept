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
  "scripts/asc-upsert-iap.mjs",
  "scripts/ios-iap-sync.sh",
  "docs/ios/SHIP_NOW.md",
  "docs/ios/screenshots/iap-review-paywall.png",
  "ios/App/App/Products.storekit",
  "ios/App/ci_scripts/ci_post_clone.sh",
  "ios/App/ci_scripts/ci_pre_xcodebuild.sh",
  ".github/workflows/asc-upsert-iap.yml",
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
if (
  iap.includes("manageProSubscriptions") &&
  (paywall.includes("manageProSubscriptions") || settings.includes("manageProSubscriptions"))
) {
  ok("manage-subscription", "wired");
} else {
  fail("manage-subscription", "manageProSubscriptions not wired");
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

// --- Live production (best-effort) ---
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
