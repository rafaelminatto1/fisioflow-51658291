import fs from 'fs';
import path from 'path';

function refactorFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Add import
  if (!content.includes("import { withTenant }")) {
    content = content.replace(
      /import \{ requireAuth[^\n]+;\n/,
      match => match + "import { withTenant } from '../lib/db-utils';\n"
    );
  }

  // Replace and(eq(table.id, id), eq(table.organizationId, user.organizationId)) - multiple lines
  content = content.replace(
    /and\(\s*eq\(([^.]+)\.id,\s*([^)]+)\),\s*eq\(\1\.organizationId,\s*user\.organizationId\)\s*\)/g,
    "withTenant($1, user.organizationId, eq($1.id, $2))"
  );

  // Replace arrays like [eq(table.organizationId, user.organizationId)]
  content = content.replace(
    /\[eq\(([^.]+)\.organizationId,\s*user\.organizationId\)\]/g,
    "[withTenant($1, user.organizationId)]"
  );

  // Replace any remaining eq(table.organizationId, user.organizationId) inside where(...)
  content = content.replace(
    /where\(eq\(([^.]+)\.organizationId,\s*user\.organizationId\)\)/g,
    "where(withTenant($1, user.organizationId))"
  );
  
  // What about eq(table.organizationId, user.organizationId) inside where conditions that aren't wrapped in and()?
  // The above where(eq(...)) handles `.where(eq(patientGoals.organizationId, user.organizationId))`

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Refactored ${filePath}`);
}

refactorFile('apps/api/src/routes/clinical.ts');
refactorFile('apps/api/src/routes/financial.ts');
