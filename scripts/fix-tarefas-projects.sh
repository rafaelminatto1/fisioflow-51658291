#!/bin/bash
# Script para aplicar migração de tarefas e projetos no Neon DB
# Execute: ./scripts/fix-tarefas-projects.sh

set -e

echo "=================================================="
echo "FisioFlow - Correção das tabelas tarefas e projects"
echo "=================================================="

# Verifica se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não está definida"
    echo "   Exporte a variável antes de executar:"
    echo "   export DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "✅ DATABASE_URL encontrada"

# Aplica a migração
echo ""
echo "📋 Aplicando migração..."
psql "$DATABASE_URL" -f workers/migrations/ensure_tarefas_projects.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migração aplicada com sucesso!"
    echo ""
    echo "Agora faça o deploy do worker:"
    echo "  pnpm workers:deploy"
    echo ""
else
    echo ""
    echo "❌ Erro ao aplicar migração"
    echo "   Tente executar manualmente o SQL em:"
    echo "   workers/migrations/ensure_tarefas_projects.sql"
    exit 1
fi