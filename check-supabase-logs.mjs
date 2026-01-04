// Script para verificar logs detalhados do Supabase
// Este script usa o MCP do Supabase para buscar logs de erros

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verificando logs do Supabase...\n');
console.log('⚠️  NOTA: Este script requer acesso ao MCP do Supabase.');
console.log('   Para logs mais detalhados, acesse o dashboard do Supabase:\n');
console.log('   https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu/logs\n');

// Informações do projeto
const SUPABASE_URL = "https://ycvbtjfrchcyvmkvuocu.supabase.co";
const PROJECT_REF = "ycvbtjfrchcyvmkvuocu";

console.log('📊 Informações do Projeto:');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Project Ref: ${PROJECT_REF}\n`);

console.log('📋 Logs a verificar manualmente no Dashboard:\n');
console.log('1. Acesse: https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu/logs');
console.log('2. Vá para "API" → Filtre por:');
console.log('   - Status: 500');
console.log('   - Path: /auth/v1/token');
console.log('   - Método: POST');
console.log('3. Vá para "Postgres" → Filtre por:');
console.log('   - Severity: ERROR');
console.log('   - Busque por: "audit_log", "trigger", "schema"');
console.log('4. Verifique stack traces e mensagens de erro completas\n');

console.log('🔗 Links úteis:');
console.log(`   - Dashboard: https://supabase.com/dashboard/project/${PROJECT_REF}`);
console.log(`   - Logs API: https://supabase.com/dashboard/project/${PROJECT_REF}/logs/api`);
console.log(`   - Logs Postgres: https://supabase.com/dashboard/project/${PROJECT_REF}/logs/postgres`);
console.log(`   - Auth Settings: https://supabase.com/dashboard/project/${PROJECT_REF}/auth/providers\n`);

console.log('💡 Dicas para análise:');
console.log('   - Procure por erros relacionados a "schema", "trigger", "function"');
console.log('   - Verifique se há problemas com a função update_last_login');
console.log('   - Verifique se há problemas com triggers on_auth_user_login');
console.log('   - Verifique se há problemas com a tabela profiles ou user_roles');
console.log('   - Correlacione timestamps de tentativas de login com erros\n');

console.log('📝 Próximos passos:');
console.log('   1. Analise os logs no dashboard');
console.log('   2. Documente os erros encontrados em ANALISE_LOGS_ERRO_500.md');
console.log('   3. Execute o script create-test-users-admin.mjs para recriar usuários\n');

