// Script para facilitar teste manual de login
// Este script inicia o servidor e abre o navegador na página de login

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Preparando ambiente para teste manual de login...\n');

// Verificar se package.json existe
const packageJsonPath = `${__dirname}/package.json`;
if (!existsSync(packageJsonPath)) {
  console.error('❌ package.json não encontrado!');
  console.log('   Certifique-se de estar no diretório raiz do projeto.\n');
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const devScript = packageJson.scripts?.dev || 'vite';

console.log('📋 Credenciais de Teste:\n');
console.log('1. Admin:');
console.log('   Email: admin@activityfisio.com');
console.log('   Senha: Admin@123\n');
console.log('2. Fisioterapeuta:');
console.log('   Email: fisio@activityfisio.com');
console.log('   Senha: Fisio@123\n');
console.log('3. Estagiário:');
console.log('   Email: estagiario@activityfisio.com');
console.log('   Senha: Estagiario@123\n');

console.log('🌐 URLs para teste:');
console.log('   Local: http://localhost:5173/auth');
console.log('   Produção: https://fisioflow.lovable.app/auth\n');

console.log('📝 Instruções:');
console.log('   1. O servidor de desenvolvimento será iniciado');
console.log('   2. Abra o navegador na URL acima');
console.log('   3. Teste login com cada usuário');
console.log('   4. Verifique console do navegador (F12) para erros');
console.log('   5. Documente resultados em TESTE_LOGIN_MANUAL.md\n');

console.log('⚠️  NOTA: Este script apenas fornece instruções.');
console.log('   Para iniciar o servidor, execute: npm run dev\n');

console.log('💡 Dicas:');
console.log('   - Mantenha o console do navegador aberto (F12)');
console.log('   - Verifique a aba "Network" para requisições falhando');
console.log('   - Verifique a aba "Console" para erros JavaScript');
console.log('   - Após cada login, faça logout antes de testar próximo usuário\n');

console.log('📖 Para mais detalhes, consulte: TESTE_LOGIN_MANUAL.md\n');

