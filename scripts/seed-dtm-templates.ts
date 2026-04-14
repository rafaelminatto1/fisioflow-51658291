import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates } from "../src/server/db/schema/templates";
import { eq } from "drizzle-orm";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const sql = neon(connectionString);
  const db = drizzle(sql);

  console.log("Iniciando a inserção de templates de DTM/ATM...");

  const dtmTemplates = [
    {
      name: "DTM — Alívio Miofascial e Relaxamento",
      description: "Foco na redução da hiperatividade dos músculos mastigatórios (masseter e temporal).",
      category: "ortopedico", conditionName: "Disfunção Temporomandibular", difficultyLevel: "iniciante", treatmentPhase: "fase_aguda", bodyPart: "coluna_cervical", estimatedDuration: 20,
      clinicalNotes: "Auto-liberação miofascial intra e extra-oral. Posicionamento da língua no palato (posição de descanso N). Respiração diafragmática.",
      contraindications: "Presença de fratura mandibular recente ou infecção aguda na região orofacial.",
      precautions: "Evitar abertura máxima da boca durante a fase de dor aguda. Monitorar cefaleias associadas.",
      evidenceLevel: "A", bibliographicReferences: ["Trials 2025: Multimodal Rehab for TMD", "JOSPT Clinical Practice Guidelines 2020"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "DTM — Coordenação Condilar e Estabilização",
      description: "Exercícios de controle motor para melhorar o trajeto de abertura e fechamento mandibular.",
      category: "ortopedico", conditionName: "Disfunção Temporomandibular", difficultyLevel: "intermediario", treatmentPhase: "fase_subaguda", bodyPart: "coluna_cervical", estimatedDuration: 25,
      clinicalNotes: "Exercícios de Rocabado. Controle de desvio lateral com espelho. Isometria suave em protrusão e lateralização.",
      contraindications: "Luxação de mandíbula não reduzida. Bloqueio articular (locking) severo sem avaliação prévia.",
      precautions: "Realizar os movimentos de forma lenta e controlada, sem estalidos ou cliques se possível.",
      evidenceLevel: "A", bibliographicReferences: ["Lindfors et al. J Oral Facial Pain 2024", "Cranio-mandibular Stabilisation Exercises RCT 2025"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    },
    {
      name: "DTM — Link Cervical e Postural",
      description: "Tratamento da influência da coluna cervical superior e postura da cabeça na ATM.",
      category: "ortopedico", conditionName: "Disfunção Temporomandibular", difficultyLevel: "iniciante", treatmentPhase: "fase_subaguda", bodyPart: "coluna_cervical", estimatedDuration: 30,
      clinicalNotes: "Mobilização cervical superior (C0-C1-C2). Fortalecimento de estabilizadores profundos do pescoço. Retração cervical (chin-tuck).",
      contraindications: "Insuficiência vertebrobasilar ou instabilidade cervical alta (ex: Down, AR).",
      precautions: "Monitorar tonturas durante os exercícios cervicais.",
      evidenceLevel: "B", bibliographicReferences: ["Asquini et al. BMJ Open 2024", "Arribas-Pascual et al. Meta-analysis 2023"],
      templateType: "system", patientProfile: "ortopedico", isActive: true, isPublic: true
    }
  ];

  for (const t of dtmTemplates) {
    const existing = await db.select().from(exerciseTemplates).where(eq(exerciseTemplates.name, t.name)).limit(1);
    if (existing.length > 0) {
      console.log(`Atualizando: ${t.name}`);
      await db.update(exerciseTemplates).set(t).where(eq(exerciseTemplates.id, existing[0].id));
    } else {
      console.log(`Criando: ${t.name}`);
      await db.insert(exerciseTemplates).values(t);
    }
  }

  console.log("Templates de DTM inseridos com sucesso.");
}

main().catch(console.error);
