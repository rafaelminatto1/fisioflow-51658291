import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates } from "../src/server/db/schema/templates";
import { eq } from "drizzle-orm";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const sql = neon(connectionString);
  const db = drizzle(sql);

  console.log("Starting comprehensive template sync...");

  const allTemplates = [
    {
      name: "Reabilitação Pós-Operatória LCA - Fase Inicial (0-4 sem)",
      description: "Foco em controle de edema, extensão total e ativação de quadríceps pós-reconstrução de LCA.",
      category: "pos_operatorio",
      conditionName: "Reconstrução LCA",
      difficultyLevel: "iniciante",
      treatmentPhase: "fase_aguda",
      bodyPart: "joelho",
      estimatedDuration: 45,
      clinicalNotes: "Meta: Extensão 0° passiva. Ativação de quadríceps sem lag. Marcha com descarga de peso conforme tolerado.",
      contraindications: "Cadeia cinética aberta (extensão) entre 30-0°. Rotação excessiva do joelho.",
      precautions: "Monitorar sinais inflamatórios e integridade da incisão.",
      evidenceLevel: "A",
      bibliographicReferences: ["Wright et al. JAAOS 2015", "MGB Sports Medicine ACL Protocol 2025"],
      templateType: "system",
      patientProfile: "pos_operatorio",
      isActive: true,
      isPublic: true
    },
    {
      name: "Manejo Conservador - Síndrome do Impacto Subacromial",
      description: "Protocolo focado em equilíbrio de força do manguito rotador e controle escapular.",
      category: "ortopedico",
      conditionName: "Impacto Subacromial",
      difficultyLevel: "intermediario",
      treatmentPhase: "fase_subaguda",
      bodyPart: "ombro",
      estimatedDuration: 40,
      clinicalNotes: "Enfâse em infraespinal e redondo menor para centramento da cabeça umeral. Mobilidade da cápsula posterior.",
      contraindications: "Exercícios acima de 90° de flexão/abdução se houver dor aguda (arco doloroso).",
      precautions: "Evitar compensação com trapézio superior.",
      evidenceLevel: "A",
      bibliographicReferences: ["Escamilla et al. PMC 2024", "BMJ Open Sport Exerc Med 2023"],
      templateType: "system",
      patientProfile: "ortopedico",
      isActive: true,
      isPublic: true
    },
    {
      name: "Entorse de Tornozelo - Retorno ao Esporte (Fase III)",
      description: "Treino pliométrico, agilidade e estabilidade dinâmica para entorses grau II/III.",
      category: "esportivo",
      conditionName: "Entorse de Tornozelo",
      difficultyLevel: "avancado",
      treatmentPhase: "retorno_ao_esporte",
      bodyPart: "tornozelo",
      estimatedDuration: 50,
      clinicalNotes: "Pular corda, saltos em Y, mudanças de direção. Uso de tape funcional se necessário.",
      contraindications: "Dor aguda durante impacto. Instabilidade mecânica severa sem suporte.",
      precautions: "Fadiga muscular aumenta risco de relesão. Monitorar técnica do salto.",
      evidenceLevel: "A",
      bibliographicReferences: ["Doherty et al. Sports Med 2017", "JOSPT Ankle Sprain Guidelines 2021"],
      templateType: "system",
      patientProfile: "esportivo",
      isActive: true,
      isPublic: true
    },
    {
      name: "Prevenção de Quedas e Sarcopenia no Idoso",
      description: "Treino de força funcional e equilíbrio dinâmico para idosos frágeis ou pré-frágeis.",
      category: "geriatrico",
      conditionName: "Sarcopenia",
      difficultyLevel: "iniciante",
      treatmentPhase: "remodelacao",
      bodyPart: "corpo_todo",
      estimatedDuration: 30,
      clinicalNotes: "Sentar e levantar, marcha tandem, fortalecimento de tríceps sural e glúteos. SPPB como avaliação.",
      contraindications: "Instabilidade hemodinâmica severa. Vertigem aguda não diagnosticada.",
      precautions: "Sempre próximo a barras ou suporte. Monitorar saturação e frequência se DPOC/ICC associado.",
      evidenceLevel: "A",
      bibliographicReferences: ["Cruz-Jentoft et al. Age Ageing 2019", "Fragility Fracture Network Guidelines"],
      templateType: "system",
      patientProfile: "idosos",
      isActive: true,
      isPublic: true
    },
    {
      name: "Hérnia de Disco Lombar - Controle Motor e Alívio",
      description: "Protocolo de McKenzie e estabilização segmentar para radiculopatia lombar.",
      category: "ortopedico",
      conditionName: "Hérnia de Disco",
      difficultyLevel: "iniciante",
      treatmentPhase: "fase_aguda",
      bodyPart: "coluna_lombar",
      estimatedDuration: 35,
      clinicalNotes: "Focar em fenômeno de centralização. Exercícios de extensão se preferência direcional confirmada.",
      contraindications: "Flexão lombar repetida se houver periferização dos sintomas.",
      precautions: "Sinais de Cauda Equina (emergência médica).",
      evidenceLevel: "A",
      bibliographicReferences: ["McKenzie & May 2003", "Danish Health Authority Clinical Guidelines"],
      templateType: "system",
      patientProfile: "ortopedico",
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

  console.log("Comprehensive template sync complete.");
}

main().catch(console.error);
