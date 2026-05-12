#!/usr/bin/env node

import childProcess from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
const originalExecFileSync = childProcess.execFileSync;

childProcess.execFileSync = (file, args = [], options = {}) => {
  if (Array.isArray(args) && args.includes("react@latest") && args.includes("react-dom@latest")) {
    console.log("  Skipping Vinext React auto-upgrade; workspace overrides pin React.");
    return Buffer.from("");
  }

  return originalExecFileSync(file, args, options);
};

syncBuiltinESMExports();

process.argv = [process.argv[0], "vinext", "build", ...process.argv.slice(2)];

// Resolve vinext from local node_modules first, then fall back to monorepo root hoisted location
function resolveVinextCli() {
  const candidates = [
    path.resolve(process.cwd(), "node_modules/vinext/dist/cli.js"),
    path.resolve(process.cwd(), "../../node_modules/vinext/dist/cli.js"),
  ];
  for (const candidate of candidates) {
    try {
      return fs.realpathSync(candidate);
    } catch {
      // try next
    }
  }
  throw new Error(`vinext cli not found. Tried:\n${candidates.join("\n")}`);
}

const cliPath = resolveVinextCli();
await import(pathToFileURL(cliPath).href);
