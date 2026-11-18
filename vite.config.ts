// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// iPad Air 2 (iOS 15.8 / WebKit 15) : compiler le JS et le CSS vers Safari 15
// (ex. blocs `static {}` de classe rejetés par iOS < 16.4).
const LEGACY_TARGET = ["es2020", "safari15"];

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    esbuild: { target: LEGACY_TARGET },
    optimizeDeps: { esbuildOptions: { target: LEGACY_TARGET } },
    build: { target: LEGACY_TARGET, cssTarget: ["safari15"] },
  },
});
