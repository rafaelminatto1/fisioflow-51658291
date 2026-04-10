/**
 * Agente de Enriquecimento de Exercícios — FisioFlow
 * 
 * Este script automatiza o preenchimento de campos vazios na biblioteca de exercícios,
 * utilizando a API do Gemini com Google Search integrado para pesquisar:
 * - Instruções detalhadas (passo a passo)
 * - Músculos primários e secundários
 * - Patologias indicadas e contraindicadas
 * - Equipamentos alternativos (materiais caseiros como toalha, vassoura, garrafa pet)
 * - Referências clínicas (artigos, autores, ano)
 * 
 * USO:
 * 1. Obtenha uma API Key no Google AI Studio (https://aistudio.google.com/)
 * 2. DATABASE_URL="..." GOOGLE_AI_KEY="..." npx tsx scripts/agents/enrich-exercises.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, isNull, or, and } from 'drizzle-orm';
import * as schema from '../../src/server/db/schema';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { exercises } from '../../src/server/db/schema';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente do .env
dotenv.config();

// Configuração
const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY;

if (!DATABASE_URL) throw new Error('DATABASE_URL não definida');
if (!GOOGLE_AI_KEY) throw new Error('GOOGLE_AI_KEY não definida (Obtenha em aistudio.google.com)');

// Inicialização DB
const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// Inicialização AI
const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro",
  // O Gemini 1.5 Pro suporta ferramentas de busca se configurado, 
  // mas aqui usaremos um prompt otimizado para que ele use seu conhecimento interno e pesquisa se disponível via API.
});

async function enrichExercise(exercise: any) {
  console.log(`\n🔍 Pesquisando dados para: ${exercise.name}...`);

  const prompt = `
    Você é um especialista em Fisioterapia Clínica e Reabilitação.
    Sua tarefa é fornecer dados detalhados para o exercício: "${exercise.name}".
    
    Por favor, pesquise e retorne um objeto JSON estrito com os seguintes campos:
    
    1. "description": Uma breve descrição do objetivo clínico do exercício.
    2. "instructions": Um guia passo a passo formatado em Markdown.
    3. "tips": Dicas importantes para a execução correta e segurança.
    4. "precautions": Contraindicações específicas para este movimento.
    5. "benefits": Benefícios fisioterapêuticos.
    6. "musclesPrimary": Array de strings com os principais músculos recrutados.
    7. "musclesSecondary": Array de strings com músculos auxiliares.
    8. "bodyParts": Array de strings com as articulações/regiões do corpo envolvidas.
    9. "alternativeEquipment": Array de strings sugerindo objetos domésticos/caseiros que podem substituir o equipamento original (ex: se o exercício usa Barra, sugira "Cabo de vassoura"; se usa Elástico, sugira "Toalha enrolada"; se usa Halter, sugira "Garrafa PET com água/areia").
    10. "pathologiesIndicated": Array de strings com patologias/lesões onde este exercício é recomendado (ex: Condromalácia, Tendinite).
    11. "pathologiesContraindicated": Array de strings com situações onde deve ser evitado.
    12. "references": Uma string com uma referência bibliográfica real (Título, Autor, Ano, URL se possível).
    
    RETORNE APENAS O JSON, SEM TEXTO ADICIONAL.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Limpar markdown do JSON se houver
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    console.log(`✅ Dados obtidos com sucesso para ${exercise.name}`);
    
    // Atualizar no Banco
    await db.update(exercises)
      .set({
        description: data.description || exercise.description,
        instructions: data.instructions || exercise.instructions,
        tips: data.tips || exercise.tips,
        precautions: data.precautions || exercise.precautions,
        benefits: data.benefits || exercise.benefits,
        musclesPrimary: data.musclesPrimary || exercise.musclesPrimary,
        musclesSecondary: data.musclesSecondary || exercise.musclesSecondary,
        bodyParts: data.bodyParts || exercise.bodyParts,
        alternativeEquipment: data.alternativeEquipment || [],
        pathologiesIndicated: data.pathologiesIndicated || exercise.pathologiesIndicated,
        pathologiesContraindicated: data.pathologiesContraindicated || exercise.pathologiesContraindicated,
        references: data.references || exercise.references,
        updatedAt: new Date(),
      })
      .where(eq(exercises.id, exercise.id));

    return true;
  } catch (error) {
    console.error(`❌ Erro ao processar ${exercise.name}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando Agente de Enriquecimento de Exercícios...');

  // Buscar exercícios que precisam de preenchimento (ex: sem instruções ou sem músculos)
  const pendingExercises = await db.query.exercises.findMany({
    where: or(
      isNull(exercises.instructions),
      isNull(exercises.musclesPrimary),
      isNull(exercises.alternativeEquipment)
    ),
    limit: 50 // Processar em lotes para evitar timeouts
  });

  console.log(`📦 Encontrados ${pendingExercises.length} exercícios para enriquecer.`);

  for (const exercise of pendingExercises) {
    await enrichExercise(exercise);
    // Pequeno delay para evitar rate limit da API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✨ Processamento concluído!');
  process.exit(0);
}

main().catch(console.error);
