#!/usr/bin/env tsx
import fs from 'fs/promises';
import { glob } from 'glob';

async function main() {
  const files = await glob('src/**/*.{ts,tsx}', { 
    ignore: ['**/node_modules/**', '**/+types/**', '**/dist/**'] 
  });
  
  let fixedCount = 0;
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    let newContent = content;
    let changed = false;
    
    // Remove unused Badge imports
    const badgeMatch = newContent.match(/import \{\s*([^}]*?)\s*,?\s*Badge\s*,?\s*([^}]*?)\s*\}\s*from/);
    if (!badgeMatch) {
      const badgeOnlyMatch = newContent.match(/import \{\s*Badge\s*\}\s*from/);
      if (badgeOnlyMatch && !content.includes('Badge(') && !content.includes('<Badge') && !content.includes('Badge.')) {
        newContent = newContent.replace(/import \{\s*Badge\s*\}\s*from/g, '// Badge removed');
        changed = true;
      }
    }
    
    // Remove unused Calendar imports (not CalendarPlus)
    const calendarMatch = newContent.match(/import \{\s*([^}]*?)\s*,?\s*Calendar\s*(?!\w)/);
    if (calendarMatch && !content.includes('Calendar(') && !content.includes('<Calendar') && !content.includes('Calendar.')) {
      // Calendar standalone unused - mark for manual review
      console.log(`${file}: Calendar import needs review`);
    }
    
    if (changed) {
      await fs.writeFile(file, newContent);
      fixedCount++;
    }
  }
  
  console.log(`Fixed ${fixedCount} files`);
}

main().catch(console.error);