/**
 * Seed Dictionary — FisioFlow
 * Run: DATABASE_URL="..." npx tsx scripts/seed-dictionary.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { isNull } from 'drizzle-orm';
import * as schema from '../src/server/db/schema';
import { physioDictionary } from '../src/data/physioDictionary';
import { exerciseDictionary } from '../src/data/exerciseDictionary';
import { procedureDictionary } from '../src/data/procedureDictionary';
import { diagnosticDictionary } from '../src/data/diagnosticDictionary';
import { protocolDictionary } from '../src/data/protocolDictionary';
import { equipmentDictionary } from '../src/data/equipmentDictionary';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL não definida');

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

const combinedDictionary = [
	...physioDictionary, 
	...exerciseDictionary,
	...procedureDictionary,
	...diagnosticDictionary,
	...protocolDictionary,
	...equipmentDictionary
];

function normalizeKey(value: string | null | undefined) {
	return (value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

function dictionaryKey(term: { pt: string; en: string; category: string }) {
	return [
		normalizeKey(term.pt),
		normalizeKey(term.en),
		normalizeKey(term.category),
	].join('|');
}

async function seed() {
  console.log('🌱 Iniciando seed do Dicionário Bilíngue...\n');

  const localTerms = combinedDictionary.map(term => ({
    pt: term.pt,
    en: term.en,
    category: term.category,
    subcategory: term.subcategory,
    aliasesPt: term.aliases_pt,
    aliasesEn: term.aliases_en,
    descriptionPt: term.description_pt,
    descriptionEn: term.description_en,
    isGlobal: true,
    updatedAt: new Date(),
  }));

  const uniqueLocalTerms = new Map<string, typeof localTerms[number]>();
  for (const term of localTerms) {
    uniqueLocalTerms.set(dictionaryKey(term), term);
  }

  const existingGlobalTerms = await db
    .select({
      pt: schema.wikiDictionary.pt,
      en: schema.wikiDictionary.en,
      category: schema.wikiDictionary.category,
    })
    .from(schema.wikiDictionary)
    .where(isNull(schema.wikiDictionary.organizationId));

  const existingKeys = new Set(existingGlobalTerms.map(dictionaryKey));
  const termsToInsert = Array.from(uniqueLocalTerms.entries())
    .filter(([key]) => !existingKeys.has(key))
    .map(([, term]) => term);

  console.log(`📊 Termos locais: ${localTerms.length}`);
  console.log(`📊 Termos locais únicos: ${uniqueLocalTerms.size}`);
  console.log(`📊 Termos globais já existentes: ${existingKeys.size}`);
  console.log(`📊 Preparando para inserir ${termsToInsert.length} termos novos...`);

  if (termsToInsert.length === 0) {
    console.log('\n✅ Nenhum termo novo para inserir');
    return;
  }

  // Inserir em lotes para evitar problemas de limite
  const batchSize = 50;
  let insertedCount = 0;

  for (let i = 0; i < termsToInsert.length; i += batchSize) {
    const batch = termsToInsert.slice(i, i + batchSize);
    await db.insert(schema.wikiDictionary).values(batch).onConflictDoNothing();
    insertedCount += batch.length;
    console.log(`   ✅ Inseridos ${insertedCount}/${termsToInsert.length} termos...`);
  }

  console.log('\n✅ SEED DO DICIONÁRIO CONCLUÍDO');
}

seed().catch(console.error);
