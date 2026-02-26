/**
 * Script para adicionar CORS a todos os serviços Cloud Run
 */

const fs = require('fs');

// Serviços Cloud Run com erro de CORS
const CLOUD_RUN_SERVICES = [
  'listPatientsV2',
  'getPatientStatsV2',
  'listAppointments',
  'getAppointmentV2',
  'createAppointmentV2',
  'updateAppointmentV2',
  'cancelAppointmentV2',
  'listEvolutionsV2',
  'getEvolutionV2',
  'createEvolutionV2',
  'updateEvolutionV2',
  'deleteEvolutionV2',
  'listExercisesV2',
  'getExerciseV2',
  'createExerciseV2',
  'updateExerciseV2',
  'deleteExerciseV2',
  'getDashboardStatsV2',
  'listPartnerships',
  'getPartnership',
  'createPartnership',
  'updatePartnership',
  'deletePartnership',
  'listAllFinancialRecordsV2',
  'listPatientFinancialRecords',
  'getPatientFinancialSummaryV2',
  'createFinancialRecord',
  'updateFinancialRecord',
  'deleteFinancialRecord',
  'markAsPaid',
];

// Código CORS para adicionar
const CORS_CODE = `
if (req.method === 'OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length');
  res.status(204).send('');
  return;
}`;

// Para requisições normais
const CORS_CODE_MAIN = \`
// Continue processamento normal...
`;

function processCloudRunFile(filePath, serviceName) {
  try {
    console.log(`📝 Processando: ${filePath} para ${serviceName}...`);

    let content = fs.readFileSync(filePath, 'utf8');

    // Buscar por 'export async function onRequest' (Cloud Functions V2 padrão)
    if (content.includes('export async function')) {
      console.log(`   Encontrada função async function onRequest`);

      // Encontrar onde a função termina (antes de criar uma nova função)
      const exportEndMatch = content.match(/\nexport async function[\s\S]+?\s*([^(\s|')]*)(?=\s*([\s(}]\s*public[^}]*\s*)/g);

      if (exportEndMatch) {
        const endLine = content.indexOf(exportEndMatch[0]);
        console.log(`   Função termina na linha ${endLine}`);

        // Inserir CORS_CODE_MAIN logo após a função export
        const nextLineStart = endLine + 2;

        if (nextLineStart < content.length && content[nextLineStart] === '}') {
          console.log(`   Inserindo CORS após linha ${nextLineStart} (posição: ${nextLineStart})`);
          content = content.substring(0, nextLineStart) + CORS_CODE_MAIN + content.substring(nextLineStart);
          break;
        }
      }
    }

    // Buscar por 'async function onRequest' (Cloud Functions V2 padrão)
    else if (content.includes('onRequest')) {
      console.log(`   Encontrada função onRequest (Cloud Functions V2)`);

      // Extrair todas as funções onRequest
      const onRequestMatches = content.matchAll(/export const [^ =]+ onRequest\([^)]+)\)/g);
      if (onRequestMatches) {
        onRequestMatches.forEach(match => {
          const options = match[2];
          const funcName = match[4];

          console.log(`   Encontrada: export const ${funcName} = onRequest(${options})`);

          // Verificar se tem CORS antes
          if (options.includes('cors: CORS_ORIGINS')) {
            console.log(`   ${funcName} JÁ TEM CORS! PULANDO`);
            continue;
          }

          // Inserir CORS_CODE_MAIN antes do objeto de opções
          const beforeCors = options.replace(/(cors:[^,]+\s*invoker[^,]+)\s*public[^}]*\s*)/, ',\n  cors: CORS_ORIGINS, invoker: \'public\',\n  ');

          content = content.replace(options, beforeCors);
        });
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');

    console.log(`✅ CORS adicionada ao ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

function findCloudRunServiceFiles() {
  console.log('\n📍 Buscando arquivos dos serviços Cloud Run...');
  console.log('='.repeat(60));

  const results = [];
  const searchPaths = [
    '/home/rafael/antigravity/fisioflow/fisioflow-51658291/functions/src',
    '/home/rafael/antigravity/fisioflow/fisioflow-51658291/cloudrun',
  ];

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      const entries = fs.readdirSync(searchPath);

      for (const entry of entries) {
        const fullPath = searchPath + '/' + entry.name;

        if (entry.isDirectory() && depth < 3) {
          searchDir(fullPath, depth + 1);
        } else if (entry.isFile() && (entry.name.endsWith('.ts'))) {
          const serviceName = path.basename(fullPath, path.extname(fullPath));

          // Verificar se é um serviço Cloud Run com erro de CORS
          const isCloudRunService = CLOUD_RUN_SERVICES.includes(serviceName);

          if (isCloudRunService) {
            console.log(`\n📝 Verificando: ${fullPath}`);
            const success = processCloudRunFile(fullPath, serviceName);

            if (success) {
              results.push({ file: fullPath, service: serviceName, status: 'CORS adicionada' });
            } else {
              results.push({ file: fullPath, service: serviceName, status: 'Já tem CORS' });
            }
          }
        }
      }
    }
  }

  // Relatório
  console.log('\n' + '='.repeat(60));
  console.log('  📊 RESULTADOS');
  console.log('='.repeat(60) + '\n');

  results.forEach(r => {
    const icon = r.status === 'CORS adicionada' ? '✅' : '❌';
    console.log(`${icon} ${r.file}: ${r.service}`);
  });

  const successCount = results.filter(r => r.status === 'CORS adicionada').length;
  const failCount = results.filter(r => r.status !== 'CORS adicionada').length;

  console.log(`\n📈 ${successCount} serviços processados com sucesso`);
  console.log(`\n❌ ${failCount} não encontrados`);

  if (successCount === 0) {
    console.log('\n⚠️  Nenhum serviço Cloud Run encontrado!');
    console.log('\n💡 Verifique:');
    console.log('   1. Se os arquivos estão em outro diretório');
    console.log('   2. Se os nomes dos serviços são diferentes');
    console.log('   3. Se os serviços são Cloud Functions (não Cloud Run)');
  }

  console.log('\n📝 Salvando resultado em: cloudrun-cors-fix-results.json');

  fs.writeFileSync('./cloudrun-cors-fix-results.json', JSON.stringify(results, null, 2));

  return results;
}

// Executar
console.log('========================================================');
console.log('  🔧 Adicionar CORS aos Serviços Cloud Run');
console.log('========================================================\n');

try {
  const results = findCloudRunServiceFiles();

  console.log(`\n🏁 Iniciando verificação de ${results.length} arquivos...`);

  const successCount = results.filter(r => r.status === 'CORS adicionada').length;

  console.log(`\n✅ ${successCount} serviços processados`);

  if (successCount === 0) {
    console.log('\n⚠️  Nenhum arquivo Cloud Run encontrado!');
    process.exit(1);
  }

  console.log('\n💡 Próximos passos:');
  console.log('  1. Revise o resultado em: cloudrun-cors-fix-results.json');
  console.log('  2. Commit as alterações');
  console.log('  3. Faça deploy das funções modificadas');
  console.log('  4. Teste o app: http://localhost:5173');
  console.log(' 5. Faça logout e login');

  process.exit(0);
} catch (error) {
  console.error('\n❌ Erro fatal:', error.message);
  process.exit(1);
}
