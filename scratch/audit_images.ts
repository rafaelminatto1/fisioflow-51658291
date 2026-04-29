import { builtinClinicalTestsCatalog } from "./src/data/clinicalTestsCatalog";
import fs from "fs";
import path from "path";

const illustrationsDir = path.join(process.cwd(), "public/clinical-tests/illustrations");
const missingFiles = [];

console.log("Checking clinical test illustrations...");

for (const test of builtinClinicalTestsCatalog) {
  if (test.image_url && test.image_url.startsWith("/clinical-tests/illustrations/")) {
    const fileName = path.basename(test.image_url);
    const filePath = path.join(illustrationsDir, fileName);

    if (!fs.existsSync(filePath)) {
      missingFiles.push({
        id: test.id,
        name: test.name,
        expectedFile: fileName,
      });
    }
  }
}

if (missingFiles.length > 0) {
  console.error("\n❌ Found missing illustration files:");
  missingFiles.forEach((f) => console.error(`- ${f.name} (${f.id}): Expected ${f.expectedFile}`));
} else {
  console.log("\n✅ All catalog illustrations are present locally!");
}
