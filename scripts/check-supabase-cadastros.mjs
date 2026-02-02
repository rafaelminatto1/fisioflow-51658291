#!/usr/bin/env node
/**
 * Script para verificar dados das páginas de cadastros no Supabase
 * Uso: node scripts/check-supabase-cadastros.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ycvbtjfrchcyvmkvuocu.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Defina VITE_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = [
  { name: 'evaluation_forms', label: 'Fichas de Avaliação', cols: ['id', 'nome', 'tipo'] },
  { name: 'evaluation_form_fields', label: 'Campos das Fichas', cols: ['id', 'form_id', 'label'] },
  { name: 'evolution_templates', label: 'Templates de Evolução', cols: ['id', 'nome', 'tipo'] },
  { name: 'servicos', label: 'Serviços', cols: ['id', 'nome', 'tipo_cobranca'] },
  { name: 'feriados', label: 'Feriados', cols: ['id', 'nome', 'data', 'tipo'] },
  { name: 'convenios', label: 'Convênios', cols: ['id', 'nome', 'ativo'] },
  { name: 'fornecedores', label: 'Fornecedores', cols: ['id', 'nome'] },
  { name: 'atestados', label: 'Atestados', cols: ['id', 'nome'] },
  { name: 'contratos', label: 'Contratos', cols: ['id', 'nome'] },
  { name: 'formas_pagamento', label: 'Formas de Pagamento', cols: ['id', 'nome'] },
  { name: 'salas', label: 'Salas', cols: ['id', 'nome'] },
  { name: 'centros_custo', label: 'Centros de Custo', cols: ['id', 'nome'] },
];

async function checkTable(table) {
  try {
    const { data, error, count } = await supabase
      .from(table.name)
      .select(table.cols.join(','), { count: 'exact' })
      .limit(10);
    if (error) {
      return { table: table.label, count: 0, total: 0, error: error.message };
    }
    return {
      table: table.label,
      count: data?.length ?? 0,
      total: count ?? 0,
      data: data,
    };
  } catch (err) {
    return { table: table.label, count: 0, total: 0, error: err.message };
  }
}

async function main() {
  console.log('\n📋 DADOS DAS PÁGINAS DE CADASTROS NO SUPABASE\n');
  console.log('Projeto:', supabaseUrl);
  console.log('─'.repeat(60));

  for (const t of TABLES) {
    const result = await checkTable(t);
    const countStr = result.error
      ? `❌ ${result.error}`
      : `✅ ${result.total > 0 ? result.total : result.count} registro(s)`;
    console.log(`\n${t.label} (${t.name}): ${countStr}`);
    if (result.data && result.data.length > 0) {
      result.data.slice(0, 3).forEach((row, i) => {
        console.log(`  ${i + 1}.`, JSON.stringify(row));
      });
    }
  }

  console.log('\n');
}

main().catch(console.error);
