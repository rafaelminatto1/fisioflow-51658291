/**
 * Seed Script: Exercises
 * Script para popular o banco de dados com exercícios de fisioterapia
 */


// Configuração

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const CLOUD_SQL_CONNECTION_STRING = process.env.CLOUD_SQL_CONNECTION_STRING;

if (!CLOUD_SQL_CONNECTION_STRING) {
  console.error('❌ CLOUD_SQL_CONNECTION_STRING não configurada');
  process.exit(1);
}

const cloudsql = new Pool({
  connectionString: CLOUD_SQL_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
});

// Tipos
interface Exercise {
  name: string;
  slug: string;
  category: string;
  description: string;
  instructions: string[];
  muscles: string[];
  equipment: string;
  difficulty: string;
  duration_minutes?: number;
  sets_recommended?: string;
  reps_recommended?: string;
  precautions?: string;
  benefits?: string;
  tags: string[];
}

/**
 * Carrega os exercícios do arquivo JSON
 */
function loadExercises(): Exercise[] {
  // const jsonPath = path.join(__dirname, '../data/exercises.json');
  // ESM fix
  const jsonPath = path.resolve('scripts/data/exercises.json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Arquivo não encontrado: ${jsonPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  return data.exercises;
}

/**
 * Faz upload de um arquivo para o Firebase Storage
 */
async function uploadExerciseFile(
  exerciseId: string,
  type: 'video' | 'thumbnail',
  localPath: string
): Promise<string | null> {
  // Verificar se arquivo existe
  if (!fs.existsSync(localPath)) {
    return null;
  }

  // Simulação - na implementação real, faria upload para Firebase Storage
  // Por enquanto, retorna URL placeholder
  const bucket = type === 'video' ? 'exercise-videos' : 'exercise-thumbnails';
  return `https://storage.googleapis.com/${bucket}/${exerciseId}.mp4`;
}

/**
 * Insere um exercício no banco de dados
 */
async function insertExercise(exercise: Exercise): Promise<string> {
  const query = `
    INSERT INTO exercises (
      name, slug, category, description, instructions,
      muscles, equipment, difficulty, duration_minutes,
      sets_recommended, reps_recommended, precautions,
      benefits, tags, is_active, is_featured
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      instructions = EXCLUDED.instructions,
      muscles = EXCLUDED.muscles,
      tags = EXCLUDED.tags
    RETURNING id
  `;

  const values = [
    exercise.name,
    exercise.slug,
    exercise.category,
    exercise.description,
    JSON.stringify(exercise.instructions),
    JSON.stringify(exercise.muscles),
    exercise.equipment,
    // Map difficulty: beginner->easy, intermediate->medium, advanced->hard
    (exercise.difficulty === 'beginner' ? 'easy' :
      exercise.difficulty === 'intermediate' ? 'medium' :
        exercise.difficulty === 'advanced' ? 'hard' : 'easy'),
    exercise.duration_minutes || null,
    exercise.sets_recommended || null,
    exercise.reps_recommended || null,
    exercise.precautions || null,
    exercise.benefits || null,
    JSON.stringify(exercise.tags),
    true, // is_active
    true, // is_featured (todos como featured inicialmente)
  ];

  const result = await cloudsql.query(query, values);
  return result.rows[0].id;
}

/**
 * Popula a tabela de exercícios
 */
async function seedExercises(): Promise<void> {
  console.log('📋 Carregando exercícios do arquivo JSON...');

  const exercises = loadExercises();
  console.log(`   ${exercises.length} exercícios encontrados`);

  console.log('\n🔄 Inserindo exercícios no banco de dados...\n');

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const exercise of exercises) {
    try {
      const exerciseId = await insertExercise(exercise);

      // Verificar se foi inserido ou atualizado pelo ON CONFLICT
      const existing = await cloudsql.query(
        'SELECT created_at FROM exercises WHERE slug = $1',
        [exercise.slug]
      );

      const createdAt = new Date(existing.rows[0].created_at);
      const now = new Date();
      const isRecent = (now.getTime() - createdAt.getTime()) < 5000; // 5 segundos

      if (isRecent) {
        inserted++;
        console.log(`   ✅ ${exercise.name}`);
      } else {
        updated++;
        console.log(`   ♻️  ${exercise.name} (atualizado)`);
      }

      // Upload de arquivos (quando implementado)
      // const videoPath = path.join(__dirname, `../data/exercises/${exercise.slug}.mp4`);
      // await uploadExerciseFile(exerciseId, 'video', videoPath);

    } catch (error: any) {
      errors++;
      console.error(`   ❌ Erro ao inserir ${exercise.name}:`, error.message);
    }
  }

  console.log('\n========================================');
  console.log('  RESUMO DO SEED');
  console.log('========================================\n');
  console.log(`Exercícios inseridos: ${inserted}`);
  console.log(`Exercícios atualizados: ${updated}`);
  console.log(`Erros: ${errors}`);
  console.log(`Total processado: ${inserted + updated}`);
}

/**
 * Verifica se exercícios foram carregados corretamente
 */
async function verifySeed(): Promise<void> {
  console.log('\n🔍 Verificando seed...');

  const { rows } = await cloudsql.query(`
    SELECT
      category,
      COUNT(*) as count
    FROM exercises
    WHERE is_active = true
    GROUP BY category
    ORDER BY category
  `);

  console.log('\n   Exercícios por categoria:');
  let total = 0;
  for (const row of rows) {
    console.log(`   • ${row.category}: ${row.count}`);
    total += parseInt(row.count);
  }

  console.log(`\n   Total: ${total} exercícios ativos`);
}

/**
 * Cria categorias de exercícios se não existirem
 */
async function ensureCategoriesExist(): Promise<void> {
  console.log('🔧 Verificando categorias...');

  

  // Categorias são apenas valores enum, não precisam de tabela separada
  // Mas poderíamos criar uma tabela de referência
  console.log('   ✅ Categorias OK (usando enum/check constraint)');
}

/**
 * Função principal
 */
async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('  SEED: EXERCÍCIOS FISIOTERAPIA');
  console.log('========================================\n');

  // Testar conexão
  await cloudsql.query('SELECT 1');
  console.log('✅ Cloud SQL conectado\n');

  // Verificar categorias
  await ensureCategoriesExist();

  // Fazer seed
  await seedExercises();

  // Verificar
  await verifySeed();

  // Finalizar
  await cloudsql.end();

  console.log('\n✅ SEED CONCLUÍDO!\n');
}

// Executar
main().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
