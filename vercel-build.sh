#!/bin/bash
# Force pnpm usage on Vercel
if [ ! -f "node_modules/.bin/vite" ]; then
  npm install -g pnpm
  pnpm install
fi
p