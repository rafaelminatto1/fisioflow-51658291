import type { Config } from "@react-router/dev/config";

export default {
  // Configurações do React Router v7
  ssr: false, // SPA mode para Cloudflare Pages
  appDirectory: "./src",
} satisfies Config;
