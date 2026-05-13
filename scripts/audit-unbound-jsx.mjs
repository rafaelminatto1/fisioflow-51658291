#!/usr/bin/env node
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const configPath =
  ts.findConfigFile(projectRoot, ts.sys.fileExists, "apps/web/tsconfig.json") ??
  ts.findConfigFile(projectRoot, ts.sys.fileExists, "tsconfig.app.json");

if (!configPath) {
  console.error("No TypeScript config found.");
  process.exit(1);
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n");
  console.error(message);
  process.exit(1);
}

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(configPath),
);

const program = ts.createProgram({
  rootNames: parsedConfig.fileNames,
  options: parsedConfig.options,
});

const checker = program.getTypeChecker();
const findings = [];

function isRelevantSourceFile(sourceFile) {
  const relative = path.relative(projectRoot, sourceFile.fileName);
  return (
    !relative.startsWith("node_modules") &&
    !relative.includes(`${path.sep}dist${path.sep}`) &&
    !relative.includes(`${path.sep}.react-router${path.sep}`) &&
    (relative.startsWith("src" + path.sep) ||
      relative.startsWith(`apps${path.sep}web${path.sep}src${path.sep}`))
  );
}

function isComponentName(name) {
  return /^[A-Z]/.test(name);
}

function inspectTagName(tagName, sourceFile) {
  if (!ts.isIdentifier(tagName) || !isComponentName(tagName.text)) return;

  const symbol = checker.getSymbolAtLocation(tagName);
  if (symbol) return;

  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    tagName.getStart(sourceFile),
  );
  findings.push({
    file: path.relative(projectRoot, sourceFile.fileName),
    line: line + 1,
    column: character + 1,
    name: tagName.text,
  });
}

function visit(node, sourceFile) {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    inspectTagName(node.tagName, sourceFile);
  }

  ts.forEachChild(node, (child) => visit(child, sourceFile));
}

for (const sourceFile of program.getSourceFiles()) {
  if (!isRelevantSourceFile(sourceFile)) continue;
  visit(sourceFile, sourceFile);
}

if (findings.length > 0) {
  console.error("Unbound JSX components found:");
  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line}:${finding.column} - ${finding.name} is used as JSX but has no local/imported symbol`,
    );
  }
  process.exit(1);
}

console.log("No unbound JSX components found.");
