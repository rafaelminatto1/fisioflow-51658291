#!/usr/bin/env tsx
import fs from 'fs/promises';
import { glob } from 'glob';

async function main() {
  const files = await glob('src/**/*.{ts,tsx}', { ignore: ['**/node_modules/**', '**/+types/**'] });
  
  for (const file of files) {
    let content = await fs.readFile(file, 'utf-8');
    
    // Remove unused PageHeader (usado mas importado)
    if (content.includes(', PageHeader,') && !content.match(/PageHeader[^}]*\}$/) && !content.includes('PageHeader title=')) {
      content = content.replace(/,\s*PageHeader/g, '');
      content = content.replace(/PageHeader, /g, '');
    }
    
    // Remove imports Block scoped unused Badge
    if (content.match(/import \{\s*Badge\s*\} from "@\/components\/ui\/badge";/) && !content.includes('<Badge') && !content.includes('Badge variant')) {
      content = content.replace(/import \{ Badge \} from "@\/components\/ui\/badge";/, '');
    }
    
    // Remove unused variables com _ prefix
    content = content.replace(/const (\w+) = declared but never used/g, 'const _$1 = ');
    
    await fs.writeFile(file, content);
  }
  
  // Fix API files too
  const apiFiles = await glob('apps/api/src/**/*.ts', { ignore: ['**/node_modules/**'] });
  for (const file of apiFiles) {
    let content = await fs.readFile(file, 'utf-8');
    
    // Remove unused user declarations
    if (content.match(/const user = context\.get\("user"\);/) && content.includes('// ')) {
      // Check if user is actually used
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('const user =') && !lines[i].includes('_user')) {
          // Simple heuristic: mark as unused if next few lines don't reference user
          let used = false;
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            if (lines[j].includes('user.') && !lines[j].includes('//')) {
              used = true;
              break;
            }
          }
          if (!used) {
            lines[i] = lines[i].replace('const user', 'const _user');
          }
        }
      }
      content = lines.join('\n');
    }
    
    await fs.writeFile(file, content);
  }
}

main().catch(console.error);