import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates } from "../src/server/db/schema/templates";
import { eq } from "drizzle-orm";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const sql = neon(connectionString);
  const db = drizzle(sql);

  console.log("Starting Expansion Seed (Pathologies & Profiles)...");

  const newTemplates = [
    {
      name: "Fibromialgia — Condicionamento Multimodal",
      description: "Protocolo baseado em evidências (2025) combinando exercícios resistidos e aeróbicos de baixo impacto.",
      category: "ortopedico",
      conditionName: "Fibromialgia",
      difficultyLevel: "iniciante",
      treatmentPhase: "remodelacao",
      bodyPart: "corpo_todo",
      estimatedDuration: 45,
      clinicalNotes: "Treino resistido mostrou maior relevância clínica a longo prazo (>30% melhora). Exercícios aquáticos recomendados para fase aguda de dor.",
      contraindications: "Exercícios de alta intensidade sem período de adaptação (risco de 'flare-ups').",
      precautions: "Monitorar fadiga extrema e sono. Escala de Borg entre 3-5.",
      evidenceLevel: "A",
      bibliographicReferences: ["Rodríguez-Domínguez et al. BJPT 2025", "ACSM Guidelines 2024"],
      templateType: "system",
      patientProfile: "ortopedico",
      isActive: true,
      isPublic: true
    },
    {
      name: "Sedentário — Programa de Início Seguro",
      description: "Foco em formação de hábito e micro-treinos para pacientes com baixo nível de atividade física.",
      category: "prevencao",
      conditionName: "Sedentarismo",
      difficultyLevel: "iniciante",
      treatmentPhase: "fase_aguda",
      bodyPart: "corpo_todo",
      estimatedDuration: 20,
      clinicalNotes: "Uso de 'micro-workouts' (3-5 mins) durante o dia. Foco em movimentos funcionais básicos: sentar-levantar e caminhadas curtas.",
      contraindications: "Cargas máximas iniciais ou treinos >60 min sem base cardiovascular.",
      precautions: "Atenção a sinais de tontura ou dispneia excessiva.",
      evidenceLevel: "B",
      bibliographicReferences: ["Petersen et al. 2025", "UAB Health Move More 2026"],
      templateType: "system",
      patientProfile: "prevencao",
      isActive: true,
      isPublic: true
    },
    {
      name: "Cervicalgia Mecânica — Controle Motor Profundo",
      description: "Fortalecimento dos flexores profundos do pescoço e estabilização escapulotorácica.",
      category: "ortopedico",
      conditionName: "Cervicalgia",
      difficultyLevel: "iniciante",
      treatmentPhase: "fase_subaguda",
      bodyPart: "coluna_cervical",
      estimatedDuration: 30,
      clinicalNotes: "Exercício de 'chin-tuck' com biofeedback pressórico. Progressão para manutenção postural funcional.",
      contraindications: "Instabilidade cervical confirmada. Vertigem cervicogênica aguda não avaliada.",
      precautions: "Evitar compensação com esternocleidomastoideo (ECM).",
      evidenceLevel: "A",
      bibliographicReferences: ["JOSPT Neck Pain Guidelines 2023", "Falla et al. 2022"],
      templateType: "system",
      patientProfile: "ortopedico",
      isActive: true,
      isPublic: true
    },
    {
      name: "Epicondilite Lateral — Protocolo de Carga (Tennis Elbow)",
      description: "Treino de Heavy Slow Resistance (HSR) e alongamento excêntrico para tendinopatia do cotovelo.",
      category: "ortopedico",
      conditionName: "Epicondilite Lateral",
      difficultyLevel: "intermediario",
      treatmentPhase: "remodelacao",
      bodyPart: "cotovelo",
      estimatedDuration: 25,
      clinicalNotes: "Protocolo Tyler Twist com barra flexível ou halteres. Carga excêntrica lenta (3-5 segundos).",
      contraindications: "Injeção de corticoide recente (< 2 semanas). Dor incapacitante ao repouso.",
      precautions: "Dor leve (2-3/10) durante o exercício é aceitável, desde que não piore após 24h.",
      evidenceLevel: "A",
      bibliographicReferences: ["Cullinane et al. 2022", "JOSPT Elbow Pain 2020"],
      templateType: "system",
      patientProfile: "ortopedico",
      isActive: true,
      isPublic: true
    },
    {
      name: "Pós-Op ATQ — Reabilitação e Precauções",
      description: "Protocolo para Artroplastia Total de Quadril. Foco em independência funcional e segurança articular.",
      category: "pos_operatorio",
      conditionName: "Artroplastia de Quadril",
      difficultyLevel: "iniciante",
      treatmentPhase: "fase_aguda",
      bodyPart: "quadril",
      estimatedDuration: 40,
      clinicalNotes: "Reforço de abdutores e treino de marcha. Educação sobre restrições de movimento.",
      contraindications: "Flexão de quadril > 90°, adução além da linha média ou rotação interna excessiva (conforme acesso cirúrgico).",
      precautions: "Monitorar sinais de TVP e integridade cicatricial.",
      evidenceLevel: "A",
      bibliographicReferences: ["Manske et al. Post-Surgical Rehab 2024", "AAOS Hip Arthroplasty Guidelines"],
      templateType: "system",
      patientProfile: "pos_operatorio",
      isActive: true,
      isPublic: true
    },
    {
      name: "Reabilitação Pós-AVC — Estabilidade e Marcha",
      description: "Treino orientado a tarefas para pacientes em fase subaguda de recuperação neurológica.",
      category: "idosos",
      conditionName: "Acidente Vascular Cerebral",
      difficultyLevel: "iniciante",
      treatmentPhase: "remodelacao",
      bodyPart: "corpo_todo",
      estimatedDuration: 50,
      clinicalNotes: "Foco em descarga de peso no lado parético, simetria de tronco e transferências funcionais.",
      contraindications: "Instabilidade hemodinâmica severa. Crises convulsivas não controladas.",
      precautions: "Risco de quedas elevado. Usar cinturão de transferência se necessário.",
      evidenceLevel: "A",
      bibliographicReferences: ["Winstein et al. AHA/ASA Guidelines", "Langhorne et al. Lancet Neurol"],
      templateType: "system",
      patientProfile: "idosos",
      isActive: true,
      isPublic: true
    },
    {
      name: "Condicionamento Respiratório — Geriatria Ativa",
      description: "Exercícios para melhora da capacidade vital e tolerância ao esforço no idoso.",
      category: "idosos",
      conditionName: "Capacidade Funcional Reduzida",
      difficultyLevel: "iniciante",
      treatmentPhase: "remodelacao",
      bodyPart: "corpo_todo",
      estimatedDuration: 30,
      clinicalNotes: "Incentivo a padrões respiratórios diafragmáticos combinados com movimentos de MMSS e MMII.",
      contraindications: "Saturação de O2 < 90% em repouso. Insuficiência cardíaca descompensada.",
      precautions: "Monitorar SpO2 e FC durante toda a sessão.",
      evidenceLevel: "B",
      bibliographicReferences: ["Spruit et al. ATS/ERS Statement", "Cochrane Rehabilitation for COPD/Elderly"],
      templateType: "system",
      patientProfile: "idosos",
      isActive: true,
      isPublic: true
    }
  ];

  for (const t of newTemplates) {
    const existing = await db.select().from(exerciseTemplates).where(eq(exerciseTemplates.name, t.name)).limit(1);
    
    if (existing.length > 0) {
      console.log(`Updating: ${t.name}`);
      await db.update(exerciseTemplates).set(t).where(eq(exerciseTemplates.id, existing[0].id));
    } else {
      console.log(`Creating: ${t.name}`);
      await db.insert(exerciseTemplates).values(t);
    }
  }

  console.log("Expansion Seed complete.");
}

main().catch(console.error);
