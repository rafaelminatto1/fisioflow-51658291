import { Project, SyntaxKind, JsxElement, Node } from "ts-morph";
import * as fs from "fs";

const project = new Project();
project.addSourceFilesAtPaths("src/pages/**/*.tsx");

const excludeFiles = [
  "PatientEvolution.tsx",
  "SessionEvolutionPage.tsx",
  "PatientEvolutionReport.tsx",
  "EvolucaoClinica.tsx",
];

for (const file of project.getSourceFiles()) {
  const baseName = file.getBaseName();
  if (excludeFiles.includes(baseName)) continue;

  let hasMainLayout = false;

  // 1. Replace imports
  for (const importDecl of file.getImportDeclarations()) {
    if (importDecl.getModuleSpecifierValue().includes("MainLayout")) {
      importDecl.replaceWithText(
        `import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";`,
      );
      hasMainLayout = true;
    }
  }

  if (!hasMainLayout) continue;

  const mainLayouts = file
    .getDescendantsOfKind(SyntaxKind.JsxElement)
    .filter((jsx) => jsx.getOpeningElement().getTagNameNode().getText() === "MainLayout");

  for (const layout of mainLayouts) {
    let titleStr = "";
    let subtitleStr = "";
    let actionsStr = "";

    // Find all h1 tags inside this MainLayout
    const h1s = layout
      .getDescendantsOfKind(SyntaxKind.JsxElement)
      .filter((jsx) => jsx.getOpeningElement().getTagNameNode().getText() === "h1");

    let headerNodeToRemove: Node | null = null;
    let fallbackH1ToRemove: Node | null = null;
    let fallbackPToRemove: Node | null = null;

    if (h1s.length > 0) {
      const h1 = h1s[0];
      // Extract title inner JSX
      titleStr = h1
        .getJsxChildren()
        .map((c) => c.getText())
        .join("")
        .trim();
      fallbackH1ToRemove = h1;

      // Extract subtitle (look for p with text-muted-foreground next to it)
      const parent = h1.getParentIfKind(SyntaxKind.JsxElement); // usually a div wrapping h1 and p
      if (parent) {
        const pTags = parent
          .getDescendantsOfKind(SyntaxKind.JsxElement)
          .filter((jsx) => jsx.getOpeningElement().getTagNameNode().getText() === "p");

        for (const p of pTags) {
          const classNameAttr = p.getOpeningElement().getAttribute("className");
          if (classNameAttr && classNameAttr.getText().includes("text-muted-foreground")) {
            subtitleStr = p
              .getJsxChildren()
              .map((c) => c.getText())
              .join("")
              .trim();
            fallbackPToRemove = p;
            break;
          }
        }

        let headerContainer = parent;
        let grandparent = parent.getParentIfKind(SyntaxKind.JsxElement);
        // Sometimes the header is in a flex container with justify-between
        if (grandparent) {
          const grandClassName = grandparent.getOpeningElement().getAttribute("className");
          if (
            grandClassName &&
            (grandClassName.getText().includes("flex") ||
              grandClassName.getText().includes("justify-between") ||
              grandClassName.getText().includes("border-b") ||
              grandClassName.getText().includes("mb-"))
          ) {
            headerContainer = grandparent;
          }
        }

        // Look for buttons inside headerContainer, but outside the h1 parent if possible
        const buttons = headerContainer
          .getDescendantsOfKind(SyntaxKind.JsxElement)
          .filter((jsx) => jsx.getOpeningElement().getTagNameNode().getText() === "Button");

        if (buttons.length > 0) {
          const children = headerContainer
            .getJsxChildren()
            .filter((c) => c.getKind() === SyntaxKind.JsxElement);
          if (children.length > 1) {
            const actionChild = children.find(
              (c) => c !== parent && c.getText().includes("Button"),
            );
            if (actionChild) {
              if (
                actionChild.getKind() === SyntaxKind.JsxElement &&
                (actionChild as JsxElement).getOpeningElement().getTagNameNode().getText() === "div"
              ) {
                actionsStr = (actionChild as JsxElement)
                  .getJsxChildren()
                  .map((c) => c.getText())
                  .join("")
                  .trim();
              } else {
                actionsStr = actionChild.getText();
              }
            }
          }
        }

        headerNodeToRemove = headerContainer;
      }
    }

    // Now, let's build the PageHeader prop strings
    let headerProps = "";
    if (titleStr) {
      if (titleStr.includes("<") || titleStr.includes("{")) {
        headerProps += ` title={<>${titleStr}</>}`;
      } else {
        headerProps += ` title="${titleStr}"`;
      }
    }

    if (subtitleStr) {
      if (subtitleStr.includes("<") || subtitleStr.includes("{")) {
        headerProps += ` subtitle={<>${subtitleStr}</>}`;
      } else {
        headerProps += ` subtitle="${subtitleStr}"`;
      }
    }

    if (actionsStr) {
      headerProps += ` actions={<>${actionsStr}</>}`;
    }

    let pageHeaderCode = "";
    if (headerProps) {
      pageHeaderCode = `<PageHeader${headerProps} />\n`;
    }

    // We have to remove the headerNode from the children of layout
    // Actually, getting the text of layout's children, and removing the text of headerNodeToRemove
    // This is safer than manipulating AST nodes directly and losing comments.

    let layoutChildrenText = layout
      .getJsxChildren()
      .map((c) => c.getText())
      .join("");

    if (headerNodeToRemove) {
      layoutChildrenText = layoutChildrenText.replace(headerNodeToRemove.getText(), "");
    } else {
      if (fallbackH1ToRemove)
        layoutChildrenText = layoutChildrenText.replace(fallbackH1ToRemove.getText(), "");
      if (fallbackPToRemove)
        layoutChildrenText = layoutChildrenText.replace(fallbackPToRemove.getText(), "");
    }

    // Replace the entire <MainLayout> block
    const newJsx = `<PageLayout>\n<PageContainer>\n${pageHeaderCode}${layoutChildrenText}\n</PageContainer>\n</PageLayout>`;

    layout.replaceWithText(newJsx);
  }
}

project.saveSync();
console.log("Migration complete.");
