#!/bin/bash
# Force pnpm usage on Vercel
npm install -g pnpm
pnpm install --no-frozen-lockfile
pnpm run build