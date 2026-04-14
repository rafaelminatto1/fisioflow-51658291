import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates } from "../src/server/db/schema/templates";
import { eq } from "drizzle-orm";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const sql = neon(connectionString);
  const db = drizzle(sql);

  console.log("Starting Final Comprehensive Template Sync...");

  const allTemplates = [
    // --- ORTOPÉDICO ---
    {
      name: "Gonartrose — Fortalecimento Funcional",
      description: "Programa de manejo conservador para Osteoartrose de Joelho grau II-III.",
      category: "ortopedico",
      conditionName: "Osteoartrose de Joelho",
      difficultyLevel: "iniciante",
      treatmentPhase: "remodelacao",
      bodyPart: "joelho",
      estimatedDuration: 40,
      clinicalNotes: "Enfoque em fortalecimento de quadríceps e glúteos. Redução de dor via carga progressiva.",
      contraindications: "Sinovite aguda com derrame articular volumoso.",
      precautions: "Evitar impacto excessivo em fases de dor > 6/10.",
      evidenceLevel: "A",
      bibliographicReferences: ["Fransen et al. Cochrane 2015", "NICE Guidelines 2022"],
      templateType: "system",
      patientProfile: "ortopedico",
      isActive: true,
      isPublic: true
    },
    {
      name: "Hérnia de Disco Lombar — Controle Motor",
      description: "Foco em centralização da dor e estabilização segmentar.",
      category: "ortopedico",
      conditionName: "Hérnia de Disco",
      difficultyLevel: "iniciante",
      treatmentPhase: "fase_aguda",
      bodyPart: "coluna_lombar",
      estimatedDuration: 30,
      clinicalNotes: "Utilizar preferência direcional (extensão/flexão).",
      contraindications: "Sinais de Cauda Equina ou déficit motor progressivo.",
      precautions: "Monitorar periferização da dor para os membros inferiores.",
      evidenceLevel: "A",
      bibliographicReferences: ["McKenzie & May 2003", "JOSPT Low Back Pain 2021"],
      templateType: "system",
      patientProfile: "ortopedico",
      isActive: true,
      isPublic: true
    },
    {
      name: "Impacto Subacromial — Estabilização Escapular",
      description: "Manejo da dor no ombro via controle do ritmo escapuloumeral.",
      category: "ortopedico",
      conditionName: "Impacto Subacromial",
      difficultyLevel: "intermediario",
      treatmentPhase: "fase_subaguda",
      bodyPart: "ombro",
      estimatedDuration: 35,
      clinicalNotes: "Enfoque em rotadores externos e trapézio inferior.",
      contraindications: "Elevação acima de 90° na fase inflamatória aguda.",
      precautions: "Evitar hipermobilidade compensatória cervical.",
      evidenceLevel: "A",
      bibliographicReferences: ["Escamilla et al. PMC 2024", "JOSPT Shoulder Pain 2020"],
      templateType: "system",
      patientProfile: "ortopedico",
      isActive: true,
      isPublic: true
    },

    // --- ESPORTIVO ---
    {
      name: "Entorse de Tornozelo — Estabilidade Dinâmica",
      description: "Prevenção de instabilidade crônica pós-entorse lateral.",
      category: "esportivo",
      conditionName: "Entorse de Tornozelo",
      difficultyLevel: "intermediario",
      treatmentPhase: "fase_subaguda",
      bodyPart: "tornozelo",
      estimatedDuration: 45,
      clinicalNotes: "Treino proprioceptivo em superfícies instáveis e saltos.",
      contraindications: "Fraturas não consolidadas ou instabilidade mecânica grau III.",
      precautions: "Monitorar fadiga durante o treino de equilíbrio.",
      evidenceLevel: "A",
      bibliographicReferences: ["Doherty et al. 2017", "JOSPT Ankle Guidelines 2021"],
      templateType: "system",
      patientProfile: "esportivo",
      isActive: true,
      isPublic: true
    },
    {
      name: "Tendinopatia Patelar — Carga Progressiva",
      description: "Protocolo de isometria e isotônico pesado para Jumpers Knee.",
      category: "esportivo",
      conditionName: "Tendinopatia Patelar",
      difficultyLevel: "avancado",
      treatmentPhase: "remodelacao",
      bodyPart: "joelho",
      estimatedDuration: 50,
      clinicalNotes: "Progressão de isometria (analgesia) para agachamento declinado.",
      contraindications: "Ruptura parcial aguda volumosa confirmada por imagem.",
      precautions: "Dor até 3/10 é aceitável durante a execução.",
      evidenceLevel: "A",
      bibliographicReferences: ["Malliaras et al. 2013", "Rio et al. BJSM 2015"],
      templateType: "system",
      patientProfile: "esportivo",
      isActive: true,
      isPublic: true
    },

    // --- PÓS-OPERATÓRIO ---
    {
      name: "Pós-Op LCA — Fase I (Proteção e Ativação)",
      description: "Semanas 0-4 pós-reconstrução de Ligamento Cruzado Anterior.",
      category: "pos_operatorio",
      conditionName: "Reconstrução LCA",
      difficultyLevel: "iniciante",
      treatmentPhase: "fase_aguda",
      bodyPart: "joelho",
      estimatedDuration: 45,
      clinicalNotes: "Foco: Extensão 0° e controle de edema. Ativação de VMO.",
      contraindications: "Cadeia aberta de extensão (30-0°) sem supervisão.",
      precautions: "Monitorar temperatura local e integridade dos pontos.",
      evidenceLevel: "A",
      bibliographicReferences: ["MGB Sports Medicine 2025", "Aspetar ACL Guidelines 2023"],
      templateType: "system",
      patientProfile: "pos_operatorio",
      isActive: true,
      isPublic: true
    },
    {
      name: "Pós-Op Manguito Rotador — Proteção Inicial",
      description: "Manejo inicial pós-reparo cirúrgico do manguito.",
      category: "pos_operatorio",
      conditionName: "Reparo de Manguito Rotador",
      difficultyLevel: "iniciante",
      treatmentPhase: "fase_aguda",
      bodyPart: "ombro",
      estimatedDuration: 30,
      clinicalNotes: "Apenas movimentos passivos e pendulares conforme protocolo cirúrgico.",
      contraindications: "Movimentação ativa ou resistência nas primeiras 6 semanas.",
      precautions: "Uso obrigatório de tipoia conforme prescrição médica.",
      evidenceLevel: "A",
      bibliographicReferences: ["Millett et al. 2016", "JOSPT Post-Op Shoulder 2022"],
      templateType: "system",
      patientProfile: "pos_operatorio",
      isActive: true,
      isPublic: true
    },

    // --- GERIÁTRICO (IDOSOS) ---
    {
      name: "Prevenção de Quedas — Equilíbrio e Força",
      description: "Programa de fortalecimento funcional para o idoso ativo.",
      category: "idosos",
      conditionName: "Fragilidade e Equilíbrio",
      difficultyLevel: "iniciante",
      treatmentPhase: "remodelacao",
      bodyPart: "corpo_todo",
      estimatedDuration: 30,
      clinicalNotes: "Sentar-levantar, marcha tandem, apoio unipodal.",
      contraindications: "Arritmias cardíacas severas não controladas.",
      precautions: "Ambiente seguro com barras de apoio próximas.",
      evidenceLevel: "A",
      bibliographicReferences: ["Sherrington et al. Cochrane 2019", "WHO Falls Prevention"],
      templateType: "system",
      patientProfile: "idosos",
      isActive: true,
      isPublic: true
    },
    {
      name: "Manutenção Funcional — Sarcopenia",
      description: "Combate à perda de massa muscular relacionada à idade.",
      category: "idosos",
      conditionName: "Sarcopenia",
      difficultyLevel: "intermediario",
      treatmentPhase: "remodelacao",
      bodyPart: "corpo_todo",
      estimatedDuration: 40,
      clinicalNotes: "Treino de resistência progressiva para grandes grupos musculares.",
      contraindications: "Fraturas osteoporóticas recentes em fase de consolidação.",
      precautions: "Monitorar sinais vitais e hidratação.",
      evidenceLevel: "A",
      bibliographicReferences: ["Cruz-Jentoft et al. 2019", "Journal of Gerontology 2023"],
      templateType: "system",
      patientProfile: "idosos",
      isActive: true,
      isPublic: true
    }
  ];

  for (const t of allTemplates) {
    const existing = await db.select().from(exerciseTemplates).where(eq(exerciseTemplates.name, t.name)).limit(1);
    
    if (existing.length > 0) {
      console.log(`Updating existing template: ${t.name}`);
      await db.update(exerciseTemplates).set(t).where(eq(exerciseTemplates.id, existing[0].id));
    } else {
      console.log(`Creating new template: ${t.name}`);
      await db.insert(exerciseTemplates).values(t);
    }
  }

  console.log("Final Comprehensive sync complete.");
}

main().catch(console.error);
