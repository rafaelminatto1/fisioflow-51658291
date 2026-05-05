import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

config({ path: resolve(rootDir, ".env.cloudflare.local"), override: false });
config({ path: resolve(rootDir, ".env.local"), override: false });
