/**
 * Seed Script: Exercises
 * Script para popular o banco de dados com exercícios de fisioterapia
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || process.env.CLOUD_SQL_CONNECTION_STRING;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL ou CLOUD_SQL_CONNECTION_STRING não configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
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
  duration_seconds?: number;
  sets_recommended?: number;
  reps_recommended?: number;
  precautions?: string;
  benefits?: string;
  tags: string[];
}

/**
 * Carrega os exercícios do arquivo JSON
 */
function loadExercises(): Exercise[] {
  const jsonPath = path.resolve('scripts/data/exercises.json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Arquivo não encontrado: ${jsonPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  return data.exercises;
}

/**
 * Garante que as categorias existam e retorna um mapa de slug -> id
 */
async function syncCategories(exercises: Exercise[]): Promise<Map<string, string>> {
  const categories = new Set(exercises.map(e => e.category));
  const categoryMap = new Map<string, string>();

  for (const catName of categories) {
    const slug = catName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    
    const res = await pool.query(`
      INSERT INTO exercise_categories (name, slug)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [catName, slug]);
    
    categoryMap.set(catName, res.rows[0].id);
  }

  return categoryMap;
}

/**
 * Insere um exercício no banco de dados
 */
async function insertExercise(exercise: Exercise, categoryId: string): Promise<string> {
  const query = `
    INSERT INTO exercises (
      name, slug, category_id, description, instructions,
      muscles_primary, equipment, difficulty, duration_seconds,
      sets_recommended, reps_recommended, precautions,
      benefits, tags, is_active, is_public, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      category_id = EXCLUDED.category_id,
      description = EXCLUDED.description,
      instructions = EXCLUDED.instructions,
      muscles_primary = EXCLUDED.muscles_primary,
      equipment = EXCLUDED.equipment,
      difficulty = EXCLUDED.difficulty,
      duration_seconds = EXCLUDED.duration_seconds,
      sets_recommended = EXCLUDED.sets_recommended,
      reps_recommended = EXCLUDED.reps_recommended,
      precautions = EXCLUDED.precautions,
      benefits = EXCLUDED.benefits,
      tags = EXCLUDED.tags,
      updated_at = NOW()
    RETURNING id
  `;

  const difficultyMap: Record<string, string> = {
    'beginner': 'iniciante',
    'intermediate': 'intermediario',
    'advanced': 'avancado'
  };

  const values = [
    exercise.name,
    exercise.slug,
    categoryId,
    exercise.description,
    exercise.instructions.join('\n'), // O schema espera text, provavelmente markdown
    exercise.muscles, // Array
    [exercise.equipment].filter(e => e !== 'nenhum'), // Array
    difficultyMap[exercise.difficulty] || 'iniciante',
    exercise.duration_seconds || null,
    exercise.sets_recommended || null,
    exercise.reps_recommended || null,
    exercise.precautions || null,
    exercise.benefits || null,
    exercise.tags,
    true, // is_active
    true, // is_public
  ];

  const result = await pool.query(query, values);
  return result.rows[0].id;
}

/**
 * Popula a tabela de exercícios
 */
async function seedExercises(): Promise<void> {
  console.log('📋 Carregando exercícios do arquivo JSON...');

  const exercises = loadExercises();
  console.log(`   ${exercises.length} exercícios encontrados`);

  console.log('🔧 Sincronizando categorias...');
  const categoryMap = await syncCategories(exercises);

  console.log('\n🔄 Inserindo exercícios no banco de dados...\n');

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const exercise of exercises) {
    try {
      const categoryId = categoryMap.get(exercise.category)!;
      await insertExercise(exercise, categoryId);
      console.log(`   ✅ ${exercise.name}`);
      inserted++;
    } catch (error: any) {
      errors++;
      console.error(`   ❌ Erro ao inserir ${exercise.name}:`, error.message);
    }
  }

  console.log('\n========================================');
  console.log('  RESUMO DO SEED');
  console.log('========================================\n');
  console.log(`Exercícios processados: ${inserted}`);
  console.log(`Erros: ${errors}`);
}

/**
 * Função principal
 */
async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('  SEED: EXERCÍCIOS FISIOTERAPIA');
  console.log('========================================\n');

  try {
    await pool.query('SELECT 1');
    console.log('✅ Banco de dados conectado\n');
    await seedExercises();
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    await pool.end();
  }

  console.log('\n✅ PROCESSO CONCLUÍDO!\n');
}

main().catch((error) => {
  console.error('Erro inesperado:', error);
  process.exit(1);
});
