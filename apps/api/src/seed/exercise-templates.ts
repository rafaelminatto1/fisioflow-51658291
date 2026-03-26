/**
 * Seed: System Exercise Templates
 *
 * Insere os 15 System_Templates pré-cadastrados com template_type = 'system'
 * e organization_id = NULL. Idempotente — verifica nomes existentes antes de inserir.
 *
 * Usage:
 *   import { seedExerciseTemplates } from './seed/exercise-templates';
 *   await seedExerciseTemplates(db);
 */

import { eq, inArray } from 'drizzle-orm';
import { exerciseTemplates } from '@fisioflow/db';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

export type DrizzleDB = NeonHttpDatabase<Record<string, unknown>>;

interface SystemTemplate {
  name: string;
  conditionName: string;
  templateVariant: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  patientProfile: 'ortopedico' | 'esportivo' | 'pos_operatorio' | 'prevencao' | 'idosos';
}

const SYSTEM_TEMPLATES: SystemTemplate[] = [
  // ── Ortopédico (5) ──────────────────────────────────────
  {
    name: 'Protocolo Lombalgia Crônica',
    conditionName: 'Lombalgia',
    templateVariant: 'Conservador',
    evidenceLevel: 'A',
    patientProfile: 'ortopedico',
  },
  {
    name: 'Protocolo Cervicalgia Postural',
    conditionName: 'Cervicalgia',
    templateVariant: 'Inicial',
    evidenceLevel: 'B',
    patientProfile: 'ortopedico',
  },
  {
    name: 'Reabilitação Tendinite Patelar',
    conditionName: 'Tendinite Patelar',
    templateVariant: 'Progressivo',
    evidenceLevel: 'B',
    patientProfile: 'ortopedico',
  },
  {
    name: 'Tratamento Fascite Plantar',
    conditionName: 'Fascite Plantar',
    templateVariant: 'Conservador',
    evidenceLevel: 'A',
    patientProfile: 'ortopedico',
  },
  {
    name: 'Reabilitação Manguito Rotador',
    conditionName: 'Síndrome do Manguito Rotador',
    templateVariant: 'Conservador',
    evidenceLevel: 'B',
    patientProfile: 'ortopedico',
  },

  // ── Esportivo (3) ───────────────────────────────────────
  {
    name: 'Retorno ao Esporte - Entorse de Tornozelo',
    conditionName: 'Entorse de Tornozelo',
    templateVariant: 'Progressivo',
    evidenceLevel: 'A',
    patientProfile: 'esportivo',
  },
  {
    name: 'Fortalecimento para Corredores',
    conditionName: 'Síndrome do Trato Iliotibial',
    templateVariant: 'Preventivo',
    evidenceLevel: 'B',
    patientProfile: 'esportivo',
  },
  {
    name: 'Prevenção de Lesões em Atletas',
    conditionName: 'Prevenção Geral',
    templateVariant: 'Funcional',
    evidenceLevel: 'B',
    patientProfile: 'esportivo',
  },

  // ── Pós-operatório (4) ──────────────────────────────────
  {
    name: 'Reconstrução LCA - Protocolo Acelerado',
    conditionName: 'Reconstrução de LCA',
    templateVariant: 'Acelerado',
    evidenceLevel: 'A',
    patientProfile: 'pos_operatorio',
  },
  {
    name: 'Prótese Total de Joelho',
    conditionName: 'Artroplastia de Joelho',
    templateVariant: 'Padrão',
    evidenceLevel: 'A',
    patientProfile: 'pos_operatorio',
  },
  {
    name: 'Prótese Total de Quadril',
    conditionName: 'Artroplastia de Quadril',
    templateVariant: 'Padrão',
    evidenceLevel: 'A',
    patientProfile: 'pos_operatorio',
  },
  {
    name: 'Reparo do Manguito Rotador',
    conditionName: 'Reparo Cirúrgico do Manguito',
    templateVariant: 'Conservador',
    evidenceLevel: 'B',
    patientProfile: 'pos_operatorio',
  },

  // ── Prevenção (3) ───────────────────────────────────────
  {
    name: 'Prevenção de Quedas',
    conditionName: 'Prevenção de Quedas',
    templateVariant: 'Funcional',
    evidenceLevel: 'A',
    patientProfile: 'prevencao',
  },
  {
    name: 'Fortalecimento Postural',
    conditionName: 'Desvios Posturais',
    templateVariant: 'Progressivo',
    evidenceLevel: 'B',
    patientProfile: 'prevencao',
  },
  {
    name: 'Ergonomia para Escritório',
    conditionName: 'Síndrome do Trabalhador Sedentário',
    templateVariant: 'Educativo',
    evidenceLevel: 'C',
    patientProfile: 'prevencao',
  },

  // ── Idosos (3) ──────────────────────────────────────────
  {
    name: 'Equilíbrio e Marcha para Idosos',
    conditionName: 'Instabilidade Postural',
    templateVariant: 'Funcional',
    evidenceLevel: 'A',
    patientProfile: 'idosos',
  },
  {
    name: 'Fortalecimento Funcional para Idosos',
    conditionName: 'Sarcopenia',
    templateVariant: 'Progressivo',
    evidenceLevel: 'B',
    patientProfile: 'idosos',
  },
  {
    name: 'Mobilidade Articular Geral',
    conditionName: 'Rigidez Articular',
    templateVariant: 'Conservador',
    evidenceLevel: 'B',
    patientProfile: 'idosos',
  },
];

/**
 * Insere os System_Templates na base de dados.
 *
 * Idempotente: busca os nomes já existentes com template_type = 'system'
 * e insere apenas os que ainda não existem.
 *
 * @param db - Instância Drizzle (Neon HTTP)
 * @returns Número de templates efetivamente inseridos
 */
export async function seedExerciseTemplates(db: DrizzleDB): Promise<number> {
  const allNames = SYSTEM_TEMPLATES.map((t) => t.name);

  // Fetch existing system templates by name to avoid duplicates
  const existing = await db
    .select({ name: exerciseTemplates.name })
    .from(exerciseTemplates)
    .where(
      inArray(exerciseTemplates.name, allNames) &&
        eq(exerciseTemplates.templateType, 'system'),
    );

  const existingNames = new Set(existing.map((r) => r.name));

  const toInsert = SYSTEM_TEMPLATES.filter((t) => !existingNames.has(t.name));

  if (toInsert.length === 0) {
    console.log(
      `[seed:exercise-templates] All ${SYSTEM_TEMPLATES.length} system templates already exist — skipping.`,
    );
    return 0;
  }

  const rows = toInsert.map((t) => ({
    name: t.name,
    conditionName: t.conditionName,
    templateVariant: t.templateVariant,
    evidenceLevel: t.evidenceLevel,
    patientProfile: t.patientProfile,
    templateType: 'system' as const,
    organizationId: null,
    isActive: true,
    isDraft: false,
    isPublic: true,
    exerciseCount: 0,
  }));

  await db.insert(exerciseTemplates).values(rows);

  console.log(
    `[seed:exercise-templates] Inserted ${toInsert.length}/${SYSTEM_TEMPLATES.length} system templates` +
      (existingNames.size > 0 ? ` (${existingNames.size} already existed)` : ''),
  );

  return toInsert.length;
}
