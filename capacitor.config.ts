import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mizano.testapp",
  appName: "Mizano Test",
  webDir: "dist",
  server: {
    // Test-only remote wrapper: keeps API requests on the same Vercel origin.
    url: process.env.MIZANO_TEST_URL ?? "https://project-migration-studio-rkshdtk3o-ndnskvksjcjjdjdj-5162.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
