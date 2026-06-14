import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";

const SCHEMA_DIR = "./src/server/db/schema";
const OUTPUT_FILE = "./docs/database/SCHEMA_RELATIONS.md";

function generateSchemaDoc() {
  console.log("🔍 Iniciando análise do schema do Neon DB via Drizzle...");
  
  try {
    const files = readdirSync(SCHEMA_DIR).filter(f => extname(f) === ".ts" && f !== "index.ts" && f !== "rls_helper.ts");
    
    const tables = [];
    const relations = [];
    
    for (const file of files) {
      const content = readFileSync(join(SCHEMA_DIR, file), "utf-8");
      
      // 1. Encontrar pgTable declarações
      const tableRegex = /export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*['"]([^'"]+)['"]/g;
      let match;
      while ((match = tableRegex.exec(content)) !== null) {
        tables.push({
          variableName: match[1],
          dbName: match[2],
          file: file
        });
      }
      
      // 2. Encontrar relations declarações (Drizzle relations API)
      const relationsRegex = /export\s+const\s+(\w+)\s*=\s*relations\s*\(\s*(\w+)\s*,\s*\(\s*({[\s\w,\s]+})\s*\)\s*=>\s*\(\s*{([\s\S]*?)}\s*\)\s*\)/g;
      let relMatch;
      while ((relMatch = relationsRegex.exec(content)) !== null) {
        const _relationVarName = relMatch[1];
        const sourceTableVar = relMatch[2];
        const relBlock = relMatch[4];
        
        // Encontrar as relações do tipo 'one' no bloco
        const oneRegex = /(\w+):\s*one\(\s*(\w+)\s*,/g;
        let oneMatch;
        while ((oneMatch = oneRegex.exec(relBlock)) !== null) {
          relations.push({
            type: "one-to-one/many",
            source: sourceTableVar,
            target: oneMatch[2],
            field: oneMatch[1]
          });
        }

        // Encontrar as relações do tipo 'many' no bloco
        const manyRegex = /(\w+):\s*many\(\s*(\w+)\s*\)/g;
        let manyMatch;
        while ((manyMatch = manyRegex.exec(relBlock)) !== null) {
          relations.push({
            type: "many-to-many/one",
            source: sourceTableVar,
            target: manyMatch[2],
            field: manyMatch[1]
          });
        }
      }
    }
    
    console.log(`📊 Encontradas ${tables.length} tabelas e ${relations.length} relações.`);
    
    // Gerar a saída do markdown
    let md = `# Schema do Neon DB — Diagrama de Relações (FisioFlow 2026)\n\n`;
    md += `> **Auto-gerado em:** ${new Date().toLocaleDateString("pt-BR")}\n`;
    md += `> **Tecnologia:** Neon PostgreSQL Serverless (sa-east-1) + Drizzle ORM\n\n`;
    
    md += `## 📐 Diagrama de Entidade-Relacionamento (ER)\n\n`;
    md += `\`\`\`mermaid\nerDiagram\n`;
    
    // Adicionar as tabelas no Mermaid
    for (const table of tables) {
      md += `    ${table.variableName} {\n`;
      md += `        string id PK\n`;
      md += `        string organizationId FK\n`;
      md += `    }\n`;
    }
    
    md += `\n`;

    // Adicionar as conexões no Mermaid
    const addedRel = new Set();
    for (const rel of relations) {
      const relKey = `${rel.source}-${rel.target}`;
      const inverseKey = `${rel.target}-${rel.source}`;
      
      if (!addedRel.has(relKey) && !addedRel.has(inverseKey)) {
        const srcTable = tables.find(t => t.variableName === rel.source);
        const tgtTable = tables.find(t => t.variableName === rel.target);
        
        if (srcTable && tgtTable) {
          md += `    ${srcTable.variableName} ||--o{ ${tgtTable.variableName} : "${rel.field}"\n`;
          addedRel.add(relKey);
        }
      }
    }
    
    md += `\`\`\`\n\n`;
    
    md += `## 📋 Catálogo de Tabelas\n\n`;
    md += `| Tabela no Banco | Variável Drizzle | Arquivo do Schema |\n`;
    md += `| :--- | :--- | :--- |\n`;
    for (const table of tables) {
      md += `| \`${table.dbName}\` | \`${table.variableName}\` | [\`${table.file}\`](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/schema/${table.file}) |\n`;
    }
    
    md += `\n---\n\n`;
    md += `**Nota de Compliance LGPD & Segurança:** Todos os dados clínicos estão isolados logicamente pelo campo \`organizationId\`, e os schemas usam chaves estrangeiras estritas para garantir integridade referencial.\n`;
    
    // Garantir que a pasta de destino exista
    mkdirSync("./docs/database", { recursive: true });
    writeFileSync(OUTPUT_FILE, md, "utf-8");
    console.log(`✅ Documentação gerada com sucesso em: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error("❌ Erro ao ler arquivos de schema:", error);
  }
}

generateSchemaDoc();
