import * as fs from "fs";
import * as path from "path";
import { globSync } from "glob";

const excludeFiles = [
  "PatientEvolution.tsx",
  "SessionEvolutionPage.tsx",
  "PatientEvolutionReport.tsx",
  "EvolucaoClinica.tsx",
];

const files = globSync("src/pages/**/*.tsx");

let changedCount = 0;

for (const file of files) {
  const fileName = path.basename(file);
  if (excludeFiles.includes(fileName)) continue;

  let content = fs.readFileSync(file, "utf-8");

  // Check if it has MainLayout
  if (!content.includes("MainLayout")) continue;

  // 1. Replace Import
  content = content.replace(
    /import\s+.*?MainLayout.*?\s+from\s+['"].*?MainLayout['"];?/g,
    'import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";',
  );

  // 2. Replace <MainLayout ...> and </MainLayout>
  // Some MainLayouts have props. We will just discard them as requested by the prompt template.
  content = content.replace(/<MainLayout[^>]*>/g, "<PageLayout>\n      <PageContainer>");
  content = content.replace(/<\/MainLayout>/g, "</PageContainer>\n    </PageLayout>");

  // 3. Extract Header
  // We need to look for a block that looks like:
  // <div ...> (optional)
  //   <h1 ...>Title</h1>
  //   <p ...>Subtitle</p> (optional)
  // </div>
  // <div ...> <Button>Action</Button> </div> (optional)
  // We will use a regex to find the `<h1>` and surrounding context.

  // A common pattern:
  // <div className="flex items-center justify-between mb-6">
  //   <div>
  //     <h1 className="...">Title</h1>
  //     <p className="...">Subtitle</p>
  //   </div>
  //   <div>
  //     <Button>...</Button>
  //   </div>
  // </div>

  // Let's use a regex to match the h1.
  // We'll extract the title from <h1[^>]*>(.*?)<\/h1>
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (h1Match) {
    let titleStr = h1Match[1].trim();
    // Sometimes title has JSX inside, e.g. <Sparkles /> Automações
    // If it's a simple string, we can put it in quotes: title="Title"
    // If it has JSX or variables, we put it in braces: title={<>Title</>}
    let titleProp = "";
    if (titleStr.includes("<") || titleStr.includes("{")) {
      titleProp = `title={<>${titleStr}</>}`;
    } else {
      titleProp = `title="${titleStr}"`;
    }

    // Try to find subtitle
    // It's usually a <p className="text-muted-foreground"...> right after <h1>
    let subtitleProp = "";
    const subtitleRegex = new RegExp(
      `<h1[^>]*>[\\s\\S]*?<\\/h1>\\s*<p[^>]*text-muted-foreground[^>]*>([\\s\\S]*?)<\\/p>`,
    );
    const subMatch = content.match(subtitleRegex);
    if (subMatch) {
      let subStr = subMatch[1].trim();
      if (subStr.includes("<") || subStr.includes("{")) {
        subtitleProp = ` subtitle={<>${subStr}</>}`;
      } else {
        subtitleProp = ` subtitle="${subStr}"`;
      }
    }

    // Now, we need to replace the entire header block with <PageHeader ... />
    // This is the hardest part with regex because of balanced tags.
    // Instead of a perfect regex, we can try to find the container <div> that wraps the <h1>.
    // We can do this by finding the `<h1>` position, and searching backwards for `<div` and forwards for its matching `</div>`.
    // But since it might be wrapped in multiple divs (e.g. one for flex justify-between, one for the title/subtitle),
    // let's do something simpler:
    // Replace the `<h1...` and `<p...` with `<PageHeader ... />`.
    // Then the developer can manually clean up the empty `<div>`s, OR we try to remove the immediate `<div>`s.
  }

  // fs.writeFileSync(file, content);
}
