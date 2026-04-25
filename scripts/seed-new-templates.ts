import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates, exerciseTemplateItems } from "../src/server/db/schema/templates";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log("Seeding new evidence-based templates...");

  const templatesToInsert = [
    {
      name: "Reabilitação Pós-Operatória LCA - Fase Inicial",
      description:
        "Protocolo de reabilitação baseado em evidências para as primeiras semanas após reconstrução do Ligamento Cruzado Anterior (LCA).",
      category: "pos_operatorio",
      conditionName: "Reconstrução LCA",
      difficultyLevel: "iniciante",
      treatmentPhase: "fase_aguda",
      bodyPart: "joelho",
      estimatedDuration: 45,
      templateVariant: "Inicial",
      clinicalNotes:
        "Foco na redução de edema, ganho de ADM (especialmente extensão total) e ativação do quadríceps. Uso de muletas e brace conforme orientação médica.",
      contraindications:
        "Evitar exercícios em cadeia cinética aberta de extensão do joelho entre 30°-0°. Não forçar flexão além da dor.",
      precautions:
        "Monitorar sinais de TVP ou infecção. Respeitar limites de cicatrização do enxerto.",
      progressionNotes:
        "Avançar para a próxima fase quando: extensão completa atingida sem dor, elevação da perna reta sem 'lag', e redução significativa do derrame articular.",
      evidenceLevel: "A",
      bibliographicReferences: [
        "OHSU Anterior Cruciate Ligament Reconstruction Rehabilitation Protocol Guideline, 2024",
        "Massachusetts General Brigham Sports Medicine ACL Protocol, 2025",
      ],
      templateType: "system",
      patientProfile: "pos_operatorio",
      isDraft: false,
      isActive: true,
      isPublic: true,
      exerciseCount: 5,
    },
    {
      name: "Tratamento Conservador Fascite Plantar",
      description:
        "Programa de reabilitação multimodal focando em correção ativa e passiva da biomecânica do pé.",
      category: "patologia",
      conditionName: "Fascite Plantar",
      difficultyLevel: "intermediario",
      treatmentPhase: "fase_subaguda",
      bodyPart: "tornozelo",
      estimatedDuration: 30,
      templateVariant: "Multimodal",
      clinicalNotes:
        "Inclui exercícios SFE (Short Foot Exercise) e elevação unilateral do calcanhar com toalha (protocolo de Rathleff).",
      contraindications:
        "Dor severa aguda limitante à marcha. Injeção recente de corticoide (aguardar 2-3 semanas).",
      precautions:
        "A progressão de carga deve ser lenta. Se houver exacerbação da dor no dia seguinte, reduzir volume.",
      progressionNotes:
        "Semanas 1-2: 3 séries de 12 RM. Semanas 3-4: 4x10 RM. Semanas 5-8: 5x8 RM.",
      evidenceLevel: "A",
      bibliographicReferences: [
        "Rathleff MS et al. High-load strength training improves outcome in patients with plantar fasciitis: A randomized controlled trial. Scand J Med Sci Sports. 2015",
        "The effect of multimodal rehabilitation program on pain, functional outcomes, and plantar fascia thickness in patients with plantar fasciitis. BMC Musculoskelet Disord, 2026.",
      ],
      templateType: "system",
      patientProfile: "ortopedico",
      isDraft: false,
      isActive: true,
      isPublic: true,
      exerciseCount: 4,
    },
    {
      name: "Fortalecimento Progressivo - Tendinopatia Patelar",
      description:
        "Protocolo de carga progressiva (isométrico para isotônico pesado) para tendinopatia patelar (Jumper's Knee).",
      category: "patologia",
      conditionName: "Tendinopatia Patelar",
      difficultyLevel: "avancado",
      treatmentPhase: "remodelacao",
      bodyPart: "joelho",
      estimatedDuration: 40,
      templateVariant: "Esportivo",
      clinicalNotes:
        "Fase de remodelação. Dor aceitável durante o exercício até 4/10, desde que normalize em 24h.",
      contraindications:
        "Ruptura parcial significativa aguda do tendão. Dor limitante ao repouso (>7/10).",
      precautions:
        "Evitar atividades pliométricas intensas fora da sessão de fisioterapia durante a fase inicial deste protocolo.",
      progressionNotes:
        "Iniciar isometria de quadríceps em 60 graus se dor intensa. Progredir para Agachamento Declinado (Decline Squat board) isotônico pesado.",
      evidenceLevel: "A",
      bibliographicReferences: [
        "Malliaras P et al. Achilles and patellar tendinopathy loading programmes : a systematic review comparing clinical outcomes and identifying potential mechanisms for effectiveness. Sports Med. 2013",
        "Rio E et al. Isometric exercise induces analgesia and reduces inhibition in patellar tendinopathy. Br J Sports Med. 2015",
      ],
      templateType: "system",
      patientProfile: "esportivo",
      isDraft: false,
      isActive: true,
      isPublic: true,
      exerciseCount: 3,
    },
  ];

  for (const t of templatesToInsert) {
    const [inserted] = await db
      .insert(exerciseTemplates)
      .values(t)
      .returning({ id: exerciseTemplates.id });
    console.log(`Created template: ${t.name} with ID: ${inserted.id}`);
  }

  console.log("Seeding complete. Execute: npx tsx scripts/seed-new-templates.ts");
  process.exit(0);
}

main().catch(console.error);
