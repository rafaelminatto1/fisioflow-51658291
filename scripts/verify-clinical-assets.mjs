import fs from 'fs';
import path from 'path';

const CATALOG_PATH = 'src/data/clinicalTestsCatalog.ts';
const ASSETS_DIR = 'public/clinical-tests/illustrations';

async function verifyAssets() {
    console.log('🔍 Iniciando auditoria de ativos clínicos...\n');

    if (!fs.existsSync(CATALOG_PATH)) {
        console.error('❌ Catálogo não encontrado!');
        return;
    }

    const content = fs.readFileSync(CATALOG_PATH, 'utf8');
    
    // Regex para capturar IDs e ImageURLs
    const idRegex = /id:\s*"(builtin-[^"]+)"/g;
    const urlRegex = /imageUrl:\s*"([^"]+)"/g;

    const ids = [];
    let match;
    while ((match = idRegex.exec(content)) !== null) {
        ids.push(match[1]);
    }

    const urlsInCode = [];
    while ((match = urlRegex.exec(content)) !== null) {
        urlsInCode.push(match[1]);
    }

    const filesOnDisk = fs.readdirSync(ASSETS_DIR);
    const diskPaths = filesOnDisk.map(f => `/clinical-tests/illustrations/${f}`);

    console.log(`📊 Estatísticas:`);
    console.log(`- Testes no catálogo: ${ids.length}`);
    console.log(`- URLs de imagem no código: ${urlsInCode.length}`);
    console.log(`- Arquivos no disco: ${filesOnDisk.length}\n`);

    const missingFiles = [];
    urlsInCode.forEach(url => {
        if (!diskPaths.includes(url)) {
            missingFiles.push(url);
        }
    });

    const orphanFiles = [];
    diskPaths.forEach(path => {
        if (!urlsInCode.includes(path)) {
            orphanFiles.push(path);
        }
    });

    if (missingFiles.length > 0) {
        console.log('❌ ARQUIVOS FALTANTES (Referenciados mas não existem):');
        missingFiles.forEach(f => console.log(`  - ${f}`));
    } else {
        console.log('✅ Nenhum link quebrado encontrado.');
    }

    if (orphanFiles.length > 0) {
        console.log('\n⚠️ ARQUIVOS ÓRFÃOS (No disco mas não usados):');
        orphanFiles.forEach(f => console.log(`  - ${f}`));
    } else {
        console.log('✅ Nenhuma imagem órfã encontrada.');
    }

    // Verificar extensões legadas
    const legacyFiles = diskPaths.filter(f => f.endsWith('.avif'));
    if (legacyFiles.length > 0) {
        console.log(`\n📦 ARQUIVOS LEGADOS (.avif) - Candidatos a substituição: ${legacyFiles.length}`);
    }
}

verifyAssets();
