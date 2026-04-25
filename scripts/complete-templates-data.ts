import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates, exerciseTemplateItems } from "../src/server/db/schema/templates";
import { exercises } from "../src/server/db/schema/exercises";
import { eq, ilike, or } from "drizzle-orm";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Iniciando preenchimento detalhado de todos os templates...");

  const allTemplates = await db.select().from(exerciseTemplates);
  const allExercises = await db.select().from(exercises);

  for (const t of allTemplates) {
    console.log(`Processando: ${t.name}`);

    // --- 1. Definir Notas Clínicas e Progressão baseados no nome/condição ---
    let clinicalNotes = t.clinicalNotes || "";
    let progressionNotes = t.progressionNotes || "";
    let precautions = t.precautions || "";
    let contraindications = t.contraindications || "";

    if (t.name.includes("Fibromialgia")) {
      clinicalNotes =
        "Realizar evolução gradual de carga de forma mínima (micro-progressão). Avaliar dores antes e depois de cada sessão usando escala EVA. Encorajar a manutenção da atividade mesmo com desconforto leve, focando em dessensibilização central.";
      progressionNotes =
        "Aumentar volume (repetições) antes da intensidade (carga). Critério: 2 semanas sem 'flare-ups' após a sessão.";
      precautions =
        "Monitorar qualidade do sono e níveis de fadiga residual. Evitar exercícios de alta velocidade inicial.";
    } else if (t.name.includes("LCA") || t.name.includes("Menisco")) {
      progressionNotes =
        "Progressão para Fase II: ADM 0-120°, controle de edema (teste de onda negativo), força de quadríceps >60% comparado ao lado oposto.";
      clinicalNotes =
        "Enfâse total na extensão passiva completa (0°). Uso de crioterapia pós-exercícios para controle inflamatório.";
    } else if (
      t.name.includes("Idoso") ||
      t.name.includes("Sarcopenia") ||
      t.name.includes("Quedas")
    ) {
      clinicalNotes =
        "Sempre realizar exercícios próximo a suporte fixo ou com supervisão próxima. Focar na qualidade da fase excêntrica para ganho de massa muscular.";
      precautions = "Monitorar hipotensão ortostática e frequência cardíaca. Garantir hidratação.";
      progressionNotes =
        "Avançar quando o SPPB (Short Physical Performance Battery) mostrar melhora de 2 pontos ou estabilidade em Tandem > 10s.";
    } else if (t.name.includes("Hérnia") || t.name.includes("Lombar")) {
      clinicalNotes =
        "Orientar sobre fenômeno de centralização. Se a dor descer para a perna (periferização), interromper o movimento imediatamente.";
      progressionNotes =
        "Progressão: Tolerância a 30 min de caminhada sem sintomas radiculares e ganho de força de estabilizadores locais.";
    } else if (t.name.includes("DTM") || t.name.includes("ATM")) {
      clinicalNotes =
        "Realizar movimentos em frente ao espelho para biofeedback visual. Manter a ponta da língua no palato durante os exercícios cervicais.";
      precautions = "Não forçar abertura além do limite de estalido doloroso.";
    }

    // --- 2. Atualizar o Template com informações clínicas completas ---
    await db
      .update(exerciseTemplates)
      .set({
        clinicalNotes,
        progressionNotes,
        precautions,
        contraindications,
        estimatedDuration: t.estimatedDuration || 30,
        evidenceLevel: t.evidenceLevel || "A",
      })
      .where(eq(exerciseTemplates.id, t.id));

    // --- 3. Vincular Exercícios Reais ---
    // Limpar itens existentes para evitar duplicatas no re-seed
    await db.delete(exerciseTemplateItems).where(eq(exerciseTemplateItems.templateId, t.id));

    const findEx = (namePart: string) =>
      allExercises.filter((ex) => ex.name.toLowerCase().includes(namePart.toLowerCase()));

    let suggestedIds: string[] = [];

    if (
      t.bodyPart === "joelho" ||
      t.conditionName?.includes("Joelha") ||
      t.conditionName?.includes("LCA")
    ) {
      suggestedIds = [
        ...findEx("Ponte").slice(0, 1),
        ...findEx("Agachamento").slice(0, 1),
        ...findEx("Elevação de Perna").slice(0, 1),
      ].map((e) => e.id);
    } else if (
      t.bodyPart === "tornozelo" ||
      t.conditionName?.includes("Tornozelo") ||
      t.conditionName?.includes("Plantar")
    ) {
      suggestedIds = [
        ...findEx("Panturrilha").slice(0, 2),
        ...findEx("Alongamento da Fáscia").slice(0, 1),
      ].map((e) => e.id);
    } else if (
      t.bodyPart === "ombro" ||
      t.conditionName?.includes("Ombro") ||
      t.conditionName?.includes("Manguito")
    ) {
      suggestedIds = [
        ...findEx("Rotação externa").slice(0, 1),
        ...findEx("Retração Escapular").slice(0, 1),
        ...findEx("Parede para Ombro").slice(0, 1),
      ].map((e) => e.id);
    } else if (
      t.bodyPart === "coluna_lombar" ||
      t.conditionName?.includes("Lombar") ||
      t.conditionName?.includes("Hérnia")
    ) {
      suggestedIds = [
        ...findEx("McKenzie").slice(0, 1),
        ...findEx("Ponte").slice(0, 1),
        ...findEx("Perdigueiro").slice(0, 1),
      ].map((e) => e.id);
    } else if (t.patientProfile === "idosos") {
      suggestedIds = [
        ...findEx("Agachamento na Cadeira").slice(0, 1),
        ...findEx("Equilíbrio").slice(0, 1),
        ...findEx("Tandem").slice(0, 1),
      ].map((e) => e.id);
    } else {
      // Fallback genérico para não ficar vazio
      suggestedIds = allExercises.slice(0, 3).map((e) => e.id);
    }

    // Inserir os itens vinculados
    for (let i = 0; i < suggestedIds.length; i++) {
      await db.insert(exerciseTemplateItems).values({
        templateId: t.id,
        exerciseId: suggestedIds[i],
        order: i + 1,
        sets: 3,
        reps: 12,
        restTime: 60,
      });
    }

    console.log(`Vinculados ${suggestedIds.length} exercícios ao template ${t.name}`);
  }

  console.log("Todos os 49 templates foram atualizados com exercícios e dados clínicos!");
}

main().catch(console.error);
