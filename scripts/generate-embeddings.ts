/**
 * Script para gerar embeddings para exercícios existentes
 * Uso: npx tsx scripts/generate-embeddings.ts
 */


// Load env vars

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

async function generateEmbedding(text: string): Promise<number[]> {
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function generateExerciseEmbeddings() {
  console.log('🚀 Gerando embeddings para exercícios...');

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, description, instructions, category, difficulty')
    .is('embedding', null);

  if (error) {
    console.error('❌ Erro ao buscar exercícios:', error);
    return;
  }

  console.log(`📝 Encontrados ${exercises?.length || 0} exercícios sem embeddings`);

  let processed = 0;
  let errors = 0;

  for (const exercise of exercises || []) {
    try {
      // Combinar textos para embedding
      const combinedText = [
        exercise.name,
        exercise.description,
        exercise.instructions || '',
        exercise.category,
        exercise.difficulty,
      ].join(' ');

      console.log(`⚙️ Processando: ${exercise.name}`);

      // Gerar embedding
      const embedding = await generateEmbedding(combinedText);

      // Salvar no banco
      const { error: updateError } = await supabase
        .from('exercises')
        .update({ embedding })
        .eq('id', exercise.id);

      if (updateError) {
        throw updateError;
      }

      processed++;
      console.log(`✅ ${exercise.name} - OK`);

      // Rate limiting para evitar hitting OpenAI limits
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      errors++;
      console.error(`❌ Erro ao processar ${exercise.name}:`, error);
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`  ✅ Processados: ${processed}`);
  console.log(`  ❌ Erros: ${errors}`);
  console.log(`  📝 Total: ${exercises?.length || 0}`);
}

async function generateProtocolEmbeddings() {
  console.log('\n🚀 Gerando embeddings para protocolos...');

  const { data: protocols, error } = await supabase
    .from('exercise_protocols')
    .select('id, name, condition_name, protocol_type, milestones, restrictions, progression_criteria')
    .is('embedding', null);

  if (error) {
    console.error('❌ Erro ao buscar protocolos:', error);
    return;
  }

  console.log(`📝 Encontrados ${protocols?.length || 0} protocolos sem embeddings`);

  let processed = 0;
  let errors = 0;

  for (const protocol of protocols || []) {
    try {
      const combinedText = [
        protocol.name,
        protocol.condition_name || '',
        protocol.protocol_type || '',
        JSON.stringify(protocol.milestones || {}),
        JSON.stringify(protocol.restrictions || {}),
        JSON.stringify(protocol.progression_criteria || {}),
      ].join(' ');

      console.log(`⚙️ Processando: ${protocol.name}`);

      const embedding = await generateEmbedding(combinedText);

      const { error: updateError } = await supabase
        .from('exercise_protocols')
        .update({ embedding })
        .eq('id', protocol.id);

      if (updateError) {
        throw updateError;
      }

      processed++;
      console.log(`✅ ${protocol.name} - OK`);

      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      errors++;
      console.error(`❌ Erro ao processar ${protocol.name}:`, error);
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`  ✅ Processados: ${processed}`);
  console.log(`  ❌ Erros: ${errors}`);
  console.log(`  📝 Total: ${protocols?.length || 0}`);
}

async function main() {
  console.log('🎯 FisioFlow - Gerador de Embeddings\n');

  await generateExerciseEmbeddings();
  await generateProtocolEmbeddings();

  console.log('\n✅ Processo concluído!');
}

main().catch(console.error);
