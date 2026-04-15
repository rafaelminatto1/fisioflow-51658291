import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { exerciseTemplates, exerciseTemplateItems } from "../src/server/db/schema/templates";
import { exercises } from "../src/server/db/schema/exercises";
import { eq } from "drizzle-orm";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Iniciando Deep Populate - 49 Templates...");

  const allTemplates = await db.select().from(exerciseTemplates);
  const allEx = await db.select().from(exercises);

  const getEx = (name: string) => allEx.find(e => e.name.toLowerCase().includes(name.toLowerCase()));
  const searchEx = (name: string, limit = 3) => allEx.filter(e => e.name.toLowerCase().includes(name.toLowerCase())).slice(0, limit);

  for (const t of allTemplates) {
    let notes = "", contra = "", prec = "", prog = "", refs = [], items: string[] = [];
    let dur = 30, diff = "iniciante", phase = "fase_subaguda", bp = "corpo_todo";

    // LÓGICA DE PREENCHIMENTO POR GRUPO
    if (t.name.includes("DTM") || t.name.includes("ATM")) {
      notes = "Foco em relaxamento de masseter e temporal. Posição de descanso da língua (N). Biofeedback visual para evitar desvios.";
      contra = "Abertura forçada em fase de bloqueio articular agudo.";
      prec = "Evitar estalidos dolorosos. Monitorar cefaleia tensional.";
      prog = "Abertura mandibular > 40mm sem dor e sem desvio.";
      refs = ["CPG JOSPT 2020", "Rocabado Protocols"];
      bp = "coluna_cervical";
      items = ["Cervical", "Masseter", "Língua"];
    } else if (t.name.includes("Fibromialgia")) {
      notes = "Princípio da micro-progressão. Educação em dor (neurociência). Sessões curtas no início.";
      contra = "Treino de alta intensidade sem adaptação (risco de flare-up).";
      prec = "Escala de Borg 3-5. Monitorar sono e humor.";
      prog = "Consistência de 3 sessões/semana por 1 mês sem aumento de dor basal.";
      refs = ["EULAR Recommendations 2024", "ACSM 2024"];
      bp = "corpo_todo";
      items = ["Alongamento", "Caminhada", "Ponte"];
    } else if (t.name.includes("LCA") || t.name.includes("Menisco") || t.name.includes("Joelha")) {
      notes = "Extensão total passiva é PRIORIDADE. Ativação de quadríceps (VMO) para evitar inibição artrogênica.";
      contra = "Cadeia aberta 30-0 graus no início (estresse no enxerto).";
      prec = "Derrame articular (teste de onda). Calor local se houver edema persistente.";
      prog = "ADM 0-120 e força quadríceps > 70% do contralateral.";
      refs = ["MGB Sports Med 2025", "Aspetar 2024"];
      bp = "joelho";
      items = ["Extensão de Joelho", "Agachamento", "Ponte"];
    } else if (t.name.includes("Lombar") || t.name.includes("Disco") || t.name.includes("Espondilo")) {
      notes = "Baseado em McKenzie. Buscar centralização da dor. Fortalecimento de Transverso e Multífidos.";
      contra = "Flexão repetida se houver radiculopatia distal.";
      prec = "Sinais de alerta (Cauda Equina). Evitar repouso prolongado.";
      prog = "Tolerância a 30 min sentado e teste de SLR negativo.";
      refs = ["JOSPT LBP 2021", "McKenzie Inst."];
      bp = "coluna_lombar";
      items = ["McKenzie", "Perdigueiro", "Prancha"];
    } else if (t.name.includes("Ombro") || t.name.includes("Manguito") || t.name.includes("Subacromial")) {
      notes = "Controle escapular (serrátil e trapézio inferior). Rotadores externos em neutro.";
      contra = "Abdução acima de 90 na fase reativa.";
      prec = "Evitar encurtamento de peitoral menor.";
      prog = "Ritmo escapuloumeral normalizado e força de RE > 4/5.";
      refs = ["JOSPT Shoulder 2022"];
      bp = "ombro";
      items = ["Rotação externa", "Retração", "Parede"];
    } else if (t.name.includes("Tornozelo") || t.name.includes("Aquiles") || t.name.includes("Fascite")) {
      notes = "Treino de equilíbrio unipodal. Fortalecimento de sóleo e gastrocnêmio. Mobilidade de dorsiflexão.";
      contra = "Impacto em fase de instabilidade mecânica grau III.";
      bp = "tornozelo";
      items = ["Panturrilha", "Equilíbrio", "Fáscia"];
    } else if (t.name.includes("Idoso") || t.name.includes("Sarcopenia") || t.name.includes("Quedas") || t.name.includes("Osteoporose")) {
      notes = "Treino de força funcional (hipertrofia sarcopênica). Prevenção de fraturas.";
      contra = "Flexão axial brusca (Osteoporose).";
      prec = "Hipotensão postural. Hidratação.";
      prog = "Melhora no Timed Up and Go (TUG).";
      bp = "corpo_todo";
      items = ["Cadeira", "Tandem", "Equilíbrio"];
    } else {
      // Genérico para outros
      notes = "Seguir progressão de carga de 10% por semana. Avaliar técnica de movimento.";
      contra = "Dor > 7/10 durante execução.";
      items = ["Alongamento", "Fortalecimento", "Mobilidade"];
    }

    // UPDATE TEMPLATE
    await db.update(exerciseTemplates).set({
      description: t.description || `Protocolo clínico especializado para ${t.conditionName || t.name}.`,
      clinicalNotes: notes,
      contraindications: contra,
      precautions: prec,
      progressionNotes: prog,
      bibliographicReferences: refs,
      difficultyLevel: t.difficultyLevel || diff,
      treatmentPhase: t.treatmentPhase || phase,
      bodyPart: t.bodyPart || bp,
      estimatedDuration: t.estimatedDuration || dur,
      evidenceLevel: t.evidenceLevel || "A",
      exerciseCount: 3,
      isActive: true,
      isPublic: true,
      templateType: "custom"
    }).where(eq(exerciseTemplates.id, t.id));

    // VINCULAR ITENS
    await db.delete(exerciseTemplateItems).where(eq(exerciseTemplateItems.templateId, t.id));
    
    let matched = [];
    for (const kw of items) {
      const found = allEx.find(e => e.name.toLowerCase().includes(kw.toLowerCase()));
      if (found) matched.push(found);
    }
    // Fallback if keywords failed
    if (matched.length < 3) {
      matched = [...matched, ...allEx.slice(0, 3 - matched.length)];
    }

    for (let i=0; i<matched.length; i++) {
      await db.insert(exerciseTemplateItems).values({
        templateId: t.id,
        exerciseId: matched[i].id,
        orderIndex: i,
        sets: 3,
        repetitions: 12,
        duration: 30,
        notes: "Realizar com controle motor e foco na fase excêntrica."
      });
    }
    console.log(`Preenchido: ${t.name} (${matched.length} ex)`);
  }

  console.log("Deep Populate concluído com sucesso!");
}
main();
