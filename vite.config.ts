import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Deploy target: Vercel (instead of the default Cloudflare Workers preset).
// We disable the Cloudflare plugin and tell TanStack Start to build for Vercel.
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    target: "vercel",
  },
});
