#!/usr/bin/env node

/**
 * Script para migrar imports de componentes UI para shared
 *
 * Uso: node scripts/migrate-ui-imports.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Componentes que têm versão shared
const sharedComponents = [
  'accordion',
  'alert',
  'alert-dialog',
  'alert-title',
  'alert-description',
  'aspect-ratio',
  'avatar',
  'avatar-image',
  'avatar-fallback',
  'badge',
  'breadcrumb',
  'button',
  'calendar',
  'card',
  'card-header',
  'card-title',
  'card-description',
  'card-content',
  'card-footer',
  'carousel',
  'checkbox',
  'collapsible',
  'command',
  'context-menu',
  'date-range-picker',
  'dialog',
  'dialog-trigger',
  'dialog-content',
  'dialog-header',
  'dialog-title',
  'dialog-description',
  'dialog-close',
  'dropdown-menu',
  'dropdown-menu-trigger',
  'dropdown-menu-content',
  'dropdown-menu-item',
  'dropdown-menu-separator',
  'form',
  'hover-card',
  'input',
  'input-otp',
  'label',
  'menubar',
  'navigation-menu',
  'pagination',
  'popover',
  'popover-trigger',
  'popover-content',
  'popover-close',
  'progress',
  'radio-group',
  'resizable',
  'scroll-area',
  'select',
  'separator',
  'sheet',
  'sidebar',
  'slider',
  'switch',
  'table',
  'tabs',
  'tabs-list',
  'tabs-trigger',
  'tabs-content',
  'textarea',
  'toast',
  'toaster',
  'toggle',
  'toggle-group',
  'tooltip',
  'tooltip-trigger',
  'tooltip-content',
  'tooltip-provider',
  'sonner',
];

// Mapeamento de imports antigos para novos
const importMappings = {
  '@/components/ui': '@/components/shared/ui',
};

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Para cada mapeamento
    for (const [oldPath, newPath] of Object.entries(importMappings)) {
      // Regex para encontrar imports
      const regex = new RegExp(
        `from\\s+['"](${oldPath.replace('/', '\\/')})/([^'"]+)['"]`,
        'g'
      );

      content = content.replace(regex, (match, basePath, componentName) => {
        // Verificar se o componente existe como shared
        const componentNameWithoutExtension = componentName.replace(/\.tsx?$/, '');

        if (sharedComponents.includes(componentNameWithoutExtension)) {
          modified = true;
          return `from '${newPath}/${componentNameWithoutExtension}'`;
        }

        return match;
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Migrated: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findFilesToMigrate(dir) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip node_modules, .git, dist
      if (['node_modules', '.git', 'dist', '.next', 'build'].includes(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function main() {
  console.log('🔄 Starting UI imports migration...\n');

  const srcDir = path.join(__dirname, '..', 'src');
  const files = findFilesToMigrate(srcDir);

  console.log(`📁 Found ${files.length} TypeScript/JavaScript files\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    if (migrateFile(file)) {
      migratedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`\n✨ Migration complete!`);
  console.log(`   📝 Migrated: ${migratedCount} files`);
  console.log(`   ⏭️  Skipped: ${skippedCount} files`);
  console.log(`\n💡 Run 'pnpm lint --fix' to fix any formatting issues\n`);
}

if (require.main === module) {
  main();
}

module.exports = { migrateFile, findFilesToMigrate };
