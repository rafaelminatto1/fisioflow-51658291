#!/usr/bin/env node
import { readdir, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';

const root = join(process.cwd(), 'node_modules', '.pnpm');
const wasmSuffix = '.wasm';
const entries = [];

async function walk(dir) {
  const items = await readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const abs = join(dir, item.name);
    if (item.isDirectory()) {
      await walk(abs);
      continue;
    }
    if (!item.name.endsWith(wasmSuffix)) {
      continue;
    }
    const size = (await stat(abs)).size;
    entries.push({ path: relative(process.cwd(), abs), size });
  }
}

async function main() {
  const dirs = await readdir(root, { withFileTypes: true });
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) {
      continue;
    }
    if (!dirent.name.includes('cornerstonejs')) {
      continue;
    }
    await walk(join(root, dirent.name));
  }

  if (!entries.length) {
    console.log('No DICOM codec wasm files found.');
    return;
  }

  const grouped = new Map();
  for (const entry of entries) {
    const parts = entry.path.split('/');
    const pkgDir = parts.slice(0, 3).join('/');
    const list = grouped.get(pkgDir) ?? [];
    list.push(entry);
    grouped.set(pkgDir, list);
  }

  for (const [pkg, list] of grouped) {
    const total = list.reduce((sum, item) => sum + item.size, 0);
    console.log(`${pkg} -> ${list.length} wasm files, ${(total / 1024).toFixed(2)} KB`);
    for (const entry of list) {
      console.log(`  • ${entry.path} (${(entry.size / 1024).toFixed(2)} KB)`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
