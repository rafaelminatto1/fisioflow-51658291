import fs from "fs";
import path from "path";
import { evalCases } from "./evalCases";
import { scoreHallucination, scoreClinicalUtility, scoreSafety, scorePrivacy } from "./evalScorers";
// import { AIRouter } from "../aiRouter"; // Em um cenário real, instanciaríamos o router aqui

async function main() {
  console.log("🚀 Iniciando AI Evaluation Harness (FisioFlow)...\n");

  const results = [];
  
  for (const testCase of evalCases) {
    console.log(`⏳ Avaliando caso: ${testCase.id} [${testCase.category}]`);
    
    const startTime = Date.now();
    
    // Simulação do comportamento do LLM via AIRouter (Mock)
    let mockOutput = "";
    if (testCase.category === "soap_draft") {
      mockOutput = "O paciente relata dor EVA 5 na lombar, com piora ao deitar. O fisioterapeuta realizou liberação miofascial e tens, e o paciente foi orientado a manter repouso no final de semana.";
    } else if (testCase.category === "clinical_rag" && testCase.context) {
      mockOutput = "Na última evolução, foi feito tratamento conservador focado em agachamento, e o paciente relatou melhora de 80%.";
    } else if (testCase.category === "patient_message") {
      mockOutput = "Olá! Passando para lembrar da nossa sessão amanhã às 14h. Te espero lá!";
    } else {
      mockOutput = "Desculpe, não há informação suficiente no prontuário para afirmar isso.";
    }
    
    const latency = Date.now() - startTime + Math.floor(Math.random() * 500) + 100; // Mock latency
    const estimatedCostBrl = 0.00015; // Mock cost

    // Scorers
    const hallucination = scoreHallucination(mockOutput, testCase);
    const utility = scoreClinicalUtility(mockOutput, testCase);
    const safety = scoreSafety(mockOutput);
    const privacy = scorePrivacy(mockOutput);

    // Pass / Fail Geral
    const passed = (
      hallucination.score === 1.0 && 
      safety.score === 1.0 && 
      privacy.score === 1.0
    );

    results.push({
      caseId: testCase.id,
      category: testCase.category,
      passed,
      latencyMs: latency,
      costBRL: estimatedCostBrl,
      scores: {
        hallucination: hallucination.score,
        utility: utility.score,
        safety: safety.score,
        privacy: privacy.score
      },
      reasons: {
        hallucination: hallucination.reason,
        utility: utility.reason,
        safety: safety.reason,
        privacy: privacy.reason
      },
      aiOutput: mockOutput
    });
  }

  // Geração de Relatórios
  const rootDir = process.cwd();
  
  const jsonReport = JSON.stringify(results, null, 2);
  fs.writeFileSync(path.join(rootDir, "ai_eval_report.json"), jsonReport);
  
  let mdReport = "# Relatório de Avaliação de IA (Harness)\n\n";
  let totalPassed = 0;

  for (const r of results) {
    if (r.passed) totalPassed++;
    const icon = r.passed ? "✅ PASS" : "❌ FAIL";
    mdReport += `## ${icon} Caso: ${r.caseId} (${r.category})\n`;
    mdReport += `**Latência:** ${r.latencyMs}ms | **Custo:** R$ ${r.costBRL}\n\n`;
    mdReport += `### Scores:\n`;
    mdReport += `- **Alucinação / Groundedness**: ${r.scores.hallucination} (${r.reasons.hallucination})\n`;
    mdReport += `- **Utilidade Clínica**: ${r.scores.utility} (${r.reasons.utility})\n`;
    mdReport += `- **Segurança**: ${r.scores.safety} (${r.reasons.safety})\n`;
    mdReport += `- **Privacidade (LGPD)**: ${r.scores.privacy} (${r.reasons.privacy})\n\n`;
    mdReport += `**Output Simulado do LLM:**\n> ${r.aiOutput}\n\n`;
    mdReport += `---\n\n`;
  }
  
  mdReport += `\n### Resumo\n`;
  mdReport += `**Taxa de Sucesso (Pass Rate):** ${(totalPassed / results.length) * 100}%\n`;
  
  fs.writeFileSync(path.join(rootDir, "ai_eval_report.md"), mdReport);

  console.log(`\n✅ Avaliação finalizada. ${totalPassed}/${results.length} testes passaram.`);
  console.log("📄 Relatórios gerados: ai_eval_report.json e ai_eval_report.md");
  
  if (totalPassed < results.length) {
    process.exit(1); // Falha a CI se houve erro grave
  }
}

main().catch(console.error);
