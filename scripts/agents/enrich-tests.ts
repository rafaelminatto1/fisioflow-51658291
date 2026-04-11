/**
 * Agente de Enriquecimento de Testes Clínicos — FisioFlow
 * 
 * Este script preenche os campos vazios nos templates de testes clínicos
 * utilizando a API do Gemini 2.5 Flash para buscar evidências científicas.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, isNull, or } from 'drizzle-orm';
import * as schema from '../../src/server/db/schema';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { clinicalTestTemplates } from '../../src/server/db/schema';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY;

if (!DATABASE_URL) throw new Error('DATABASE_URL não definida');
if (!GOOGLE_AI_KEY) throw new Error('GOOGLE_AI_KEY não definida');

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });
const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function enrichTest(test: any) {
  console.log(`\n🔍 Pesquisando dados para: ${test.name}...`);

  const prompt = `
    Você é um especialista em Fisioterapia Traumato-Ortopédica e Prática Baseada em Evidências.
    Sua tarefa é fornecer dados detalhados para o teste clínico: "${test.name}" (Articulação: ${test.targetJoint}).
    
    Por favor, retorne um objeto JSON estrito com:
    
    1. "nameEn": O nome técnico padrão do teste em inglês (Ex: Lachman Test).
    2. "purpose": O objetivo clínico do teste (o que ele avalia, ex: integridade do LCA).
    3. "execution": Guia passo a passo da execução do teste em Markdown.
    4. "positiveSign": Descrição do que constitui um achado positivo (ex: dor, frouxidão, clique).
    5. "sensitivitySpecificity": Dados de sensibilidade e especificidade baseados em literatura (ex: S: 85%, E: 94%).
    6. "reference": Referência bibliográfica principal (Autor, Ano, Livro/Artigo).
    
    RETORNE APENAS O JSON, SEM TEXTO ADICIONAL.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    let jsonStr = text.trim();
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1];
      if (jsonStr.startsWith('json')) jsonStr = jsonStr.substring(4);
    }
    
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      jsonStr = jsonStr.substring(start, end + 1);
    }

    const data = JSON.parse(jsonStr);

    console.log(`✅ Dados obtidos para ${test.name}`);
    
    await db.update(clinicalTestTemplates)
      .set({
        nameEn: data.nameEn || test.nameEn,
        purpose: data.purpose || test.purpose,
        execution: data.execution || test.execution,
        positiveSign: data.positiveSign || test.positiveSign,
        sensitivitySpecificity: data.sensitivitySpecificity || test.sensitivitySpecificity,
        reference: data.reference || test.reference,
        updatedAt: new Date(),
      })
      .where(eq(clinicalTestTemplates.id, test.id));

    return true;
  } catch (error) {
    console.error(`❌ Erro em ${test.name}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando Enriquecimento de Testes Clínicos...');

  const pendingTests = await db.query.clinicalTestTemplates.findMany({
    where: (table, { or, isNull }) => or(
      isNull(table.execution),
      isNull(table.purpose),
      isNull(table.positiveSign)
    )
  });

  console.log(`📦 Encontrados ${pendingTests.length} testes para enriquecer.`);

  for (const test of pendingTests) {
    await enrichTest(test);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n✨ Processamento de testes concluído!');
  process.exit(0);
}

main().catch(console.error);
