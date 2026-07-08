import { describe, it, expect } from "vitest";
import {
  wantsHumanAgent,
  conciergeHandoffMessage,
  conciergeIdentity,
} from "../ai-concierge";

describe("wantsHumanAgent — pedido explícito de humano", () => {
  it("detecta pedidos claros de atendimento humano", () => {
    const positives = [
      "Quero falar com um atendente",
      "prefiro falar com uma pessoa",
      "Posso falar com alguém?",
      "me transfere pra uma pessoa por favor",
      "chama alguém pra falar comigo",
      "quero um humano",
      "atendimento humano",
      "tem alguém aí?",
      "cadê a recepção?",
      "gostaria de falar com a recepcionista",
      "atendente",
      "humano por favor",
      "quero falar com o responsável",
    ];
    for (const p of positives) {
      expect(wantsHumanAgent(p), `deveria disparar: "${p}"`).toBe(true);
    }
  });

  it("NÃO dispara em perguntas normais nem falsos-positivos", () => {
    const negatives = [
      "Qual o valor da avaliação?",
      "Vocês atendem aos sábados?",
      "Vocês atendem alguém sem convênio?",
      "quero marcar uma avaliação",
      "vocês fazem atendimento a domicílio?",
      "atende crianças?",
      "Boa tarde, tudo bem?",
      "sou corretor de imóveis, vocês fazem parceria?",
      "sou atendente de telemarketing e queria uma parceria",
      "vocês têm algum agente da Caixa?",
      "onde fica a clínica?",
    ];
    for (const n of negatives) {
      expect(wantsHumanAgent(n), `NÃO deveria disparar: "${n}"`).toBe(false);
    }
  });

  it("é resiliente a entrada inválida/curta", () => {
    expect(wantsHumanAgent("")).toBe(false);
    expect(wantsHumanAgent("  ")).toBe(false);
    // @ts-expect-error entrada não-string
    expect(wantsHumanAgent(null)).toBe(false);
  });
});

describe("conciergeHandoffMessage", () => {
  it("é uma ponte curta e acolhedora (não fica no vácuo)", () => {
    const msg = conciergeHandoffMessage();
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(10);
    // menciona que a equipe/pessoa vai assumir
    expect(/equipe|pessoa|algu[eé]m/i.test(msg)).toBe(true);
  });
});

describe("conciergeIdentity — disclosure de IA", () => {
  it("por padrão (discloseAi undefined/true) assina como assistente virtual", () => {
    expect(conciergeIdentity({}).signature).toBe(
      "Sou o assistente virtual da Activity Fisioterapia",
    );
    expect(conciergeIdentity({ discloseAi: true }).signature).toBe(
      "Sou o assistente virtual da Activity Fisioterapia",
    );
  });

  it("com discloseAi=false mantém a persona humana (attendantName)", () => {
    expect(conciergeIdentity({ discloseAi: false }).signature).toBe(
      "Sou o Rafael da Activity Fisioterapia",
    );
  });

  it("respeita clinicName customizado na disclosure", () => {
    expect(
      conciergeIdentity({ discloseAi: true, clinicName: "Clínica X" }).signature,
    ).toBe("Sou o assistente virtual da Clínica X");
  });
});
