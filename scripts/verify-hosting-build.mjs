#!/usr/bin/env node
/**
 * Verifica se o build do hosting produziu dist/ com index.html.
 * Escreve NDJSON em .cursor/debug.log para análise de hipóteses (Page Not Found).
 */
import { readFileSync, existsSync, readdirSync, statSync, appendFileSync } from 'fs';
import { join, resolve } from 'path';

const LOG_PATH = resolve(process.cwd(), '.cursor/debug.log');
const SESSION_ID = 'debug-session';
const RUN_ID = process.env.DEBUG_RUN_ID || 'run1';

function appendLog(payload) {
  const line = JSON.stringify({
    ...payload,
    timestamp: Date.now(),
    sessionId: SESSION_ID,
    runId: RUN_ID,
  }) + '\n';
  try {
    appendFileSync(LOG_PATH, line, 'utf8');
  } catch (e) {
    console.error('Could not write debug.log:', e.message);
  }
}

// #region agent log
const firebaseJsonPath = resolve(process.cwd(), 'firebase.json');
let hostingPublic = 'dist';
try {
  const fc = JSON.parse(readFileSync(firebaseJsonPath, 'utf8'));
  hostingPublic = fc.hosting?.public ?? 'dist';
  appendLog({ hypothesisId: 'H5', location: 'verify-hosting-build.mjs:firebase.json', message: 'firebase.json hosting.public', data: { hostingPublic, path: firebaseJsonPath } });
} catch (e) {
  appendLog({ hypothesisId: 'H5', location: 'verify-hosting-build.mjs:firebase.json', message: 'firebase.json read error', data: { error: e.message } });
}
// #endregion

// #region agent log
const distPath = resolve(process.cwd(), hostingPublic);
const distExists = existsSync(distPath);
appendLog({ hypothesisId: 'H2', location: 'verify-hosting-build.mjs:distExists', message: 'dist dir exists', data: { distPath, distExists, cwd: process.cwd() } });
// #endregion

// #region agent log
const indexPath = join(distPath, 'index.html');
const indexExists = distExists && existsSync(indexPath);
appendLog({ hypothesisId: 'H1', location: 'verify-hosting-build.mjs:index.html', message: 'index.html in dist', data: { indexPath, indexExists } });
// #endregion

function listDir(dir, max = 50) {
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir);
  const entries = [];
  for (const name of names.slice(0, max)) {
    const full = join(dir, name);
    try {
      const st = statSync(full);
      entries.push({ name, isDir: st.isDirectory() });
    } catch {
      entries.push({ name, isDir: false });
    }
  }
  return entries;
}

// #region agent log
const distContents = listDir(distPath);
appendLog({ hypothesisId: 'H2', location: 'verify-hosting-build.mjs:distContents', message: 'dist directory listing', data: { count: distContents.length, entries: distContents } });
// #endregion

if (!indexExists) {
  console.error('ERROR: dist/index.html not found. Hosting will show Page Not Found.');
  process.exit(1);
}
console.log('OK: dist/index.html exists. Hosting build is valid.');
