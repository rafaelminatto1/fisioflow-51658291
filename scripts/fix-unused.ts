#!/usr/bin/env tsx
import fs from "fs/promises";
import { glob } from "glob";

const unusedImports = [
  "PageHeader",
  "Badge",
  "Calendar",
  "Map",
  "LoadingSkeleton",
  "Plus",
  "Activity",
  "CalendarClock",
  "HeartPulse",
  "FileSearch",
  "ScanFace",
  "Printer",
  "Skeleton",
  "MessageSquare",
];

async function main() {
  const files = await glob("src/**/*.{ts,tsx}", { ignore: ["**/node_modules/**", "**/+types/**"] });

  for (const file of files) {
    let content = await fs.readFile(file, "utf-8");
    let changed = false;

    for (const imp of unusedImports) {
      // Remove import lines with just this import
      const justImport = new RegExp(`import \\{ ${imp} \\} from`, "g");
      if (justImport.test(content)) {
        // Check if actually unused
        const usagePattern = new RegExp(`<${imp}|${imp}\\(`, "g");
        const hasUsage = usagePattern.test(content);
        if (!hasUsage) {
          content = content.replace(justImport, "// " + imp + " removed");
          changed = true;
        }
      }

      // Remove from multi-import lines
      const multiImport = new RegExp(`,\\s*${imp}(?=,|}`, "g");
      if (multiImport.test(content)) {
        const usagePattern = new RegExp(`<${imp}|${imp}\\(`, "g");
        const hasUsage = usagePattern.test(content);
        if (!hasUsage) {
          content = content.replace(multiImport, "");
          changed = true;
        }
      }
    }

    if (changed) {
      await fs.writeFile(file, content);
    }
  }

  // Also handle api files
  const apiFiles = await glob("apps/api/src/**/*.ts", { ignore: ["**/node_modules/**"] });
  for (const file of apiFiles) {
    const content = await fs.readFile(file, "utf-8");
    if (content.includes("Variable") && content.includes("user") && "unused".match(content)) {
      // These are unused user declarations in auth handlers
      console.log(file);
    }
  }
}

main().catch(console.error);
