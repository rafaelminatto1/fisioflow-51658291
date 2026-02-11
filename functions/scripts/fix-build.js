#!/usr/bin/env node

/**
 * Fix TypeScript build output structure
 *
 * Due to cross-project imports from functions/src to parent src,
 * TypeScript creates a nested lib/functions/src/... structure.
 * This script moves files to lib/... for Firebase deployment.
 */

const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '../lib');
const functionsDir = path.join(libDir, 'functions');

// Check if the nested functions directory exists
if (!fs.existsSync(functionsDir)) {
  console.log('✓ Build structure is correct - no fix needed');
  process.exit(0);
}

console.log('Fixing build output structure...');

// Move contents from lib/functions/* to lib/*
function moveDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  // Create destination if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      moveDirectory(srcPath, destPath);
    } else {
      // Move file
      fs.renameSync(srcPath, destPath);
    }
  }

  // Remove empty source directory
  fs.rmdirSync(src);
}

// Move lib/functions/* to lib/*
const entries = fs.readdirSync(functionsDir, { withFileTypes: true });
for (const entry of entries) {
  const srcPath = path.join(functionsDir, entry.name);
  const destPath = path.join(libDir, entry.name);

  if (entry.isDirectory()) {
    moveDirectory(srcPath, destPath);
  } else {
    fs.renameSync(srcPath, destPath);
  }
}

// Remove the now-empty functions directory
fs.rmdirSync(functionsDir);

// Verify index.js exists
const indexPath = path.join(libDir, 'src', 'index.js');
if (fs.existsSync(indexPath)) {
  console.log('✓ Build structure fixed successfully');
  console.log(`  index.js location: ${indexPath}`);
} else {
  console.error('✗ Failed to fix build structure - index.js not found');
  process.exit(1);
}
