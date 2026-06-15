import fs from "fs/promises";
import path from "path";

const searchRegex = /\bSOAP\b/g;
const replacement = "Observação Livre";
const searchRegexLower = /\bsoap\b/g;
const replacementLower = "observacao";

async function processDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Ignorar node_modules, .git, etc.
    if (entry.isDirectory()) {
      if (
        !["node_modules", ".git", ".turbo", ".expo", ".next", "build", "dist"].includes(entry.name)
      ) {
        await processDirectory(fullPath);
      }
    } else if (entry.isFile() && (fullPath.endsWith(".md") || fullPath.endsWith("SKILL.md"))) {
      try {
        let content = await fs.readFile(fullPath, "utf8");
        let updated = false;

        if (content.includes("SOAP")) {
          content = content.replace(searchRegex, replacement);
          updated = true;
        }
        if (content.includes("soap")) {
          content = content.replace(searchRegexLower, replacementLower);
          updated = true;
        }

        if (updated) {
          await fs.writeFile(fullPath, content, "utf8");
          console.log(`Updated: ${fullPath}`);
        }
      } catch (err) {
        console.error(`Error processing ${fullPath}:`, err);
      }
    }
  }
}

async function main() {
  const rootDir = process.cwd();
  console.log(`Buscando documentações em: ${rootDir}...`);
  await processDirectory(rootDir);
  console.log("Finalizado!");
}

main();
