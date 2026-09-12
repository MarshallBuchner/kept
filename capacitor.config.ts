import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell loads the production Next.js app (SSR on Vercel).
 * Custom domain (keptapp.ca) is frozen for now — stay on Vercel prod URL.
 * When domain resumes: set CAPACITOR_SERVER_URL and rebuild the iOS app.
 */
const PROD_URL =
  process.env.CAPACITOR_SERVER_URL?.trim() || "https://kept-eosin.vercel.app";

const config: CapacitorConfig = {
  appId: "ca.keptapp.app",
  appName: "Kept",
  webDir: "mobile/www",
  server: {
    url: PROD_URL,
    cleartext: false,
    allowNavigation: [
      "kept-eosin.vercel.app",
      "keptapp.ca",
      "*.keptapp.ca",
      "checkout.stripe.com",
      "js.stripe.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#f7f4ec",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#f7f4ec",
    },
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "Kept",
  },
};

export default config;
