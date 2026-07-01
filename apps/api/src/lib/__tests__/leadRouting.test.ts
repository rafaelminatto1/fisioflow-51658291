import { describe, it, expect } from "vitest";
import { pickNextAssignee, type AgentLoad } from "../leadRouting";

const agents: AgentLoad[] = [
  { id: "a", openCount: 3 },
  { id: "b", openCount: 1 },
  { id: "c", openCount: 5 },
];

describe("pickNextAssignee", () => {
  it("least_busy escolhe o agente com menos conversas abertas", () => {
    expect(pickNextAssignee(agents, "least_busy")).toBe("b");
  });

  it("least_busy desempata de forma estável (por id)", () => {
    const tie: AgentLoad[] = [
      { id: "z", openCount: 2 },
      { id: "a", openCount: 2 },
    ];
    expect(pickNextAssignee(tie, "least_busy")).toBe("a");
  });

  it("round_robin cicla a partir do último atribuído", () => {
    expect(pickNextAssignee(agents, "round_robin", null)).toBe("a");
    expect(pickNextAssignee(agents, "round_robin", "a")).toBe("b");
    expect(pickNextAssignee(agents, "round_robin", "b")).toBe("c");
    expect(pickNextAssignee(agents, "round_robin", "c")).toBe("a"); // volta ao início
  });

  it("round_robin com último id desconhecido começa do primeiro", () => {
    expect(pickNextAssignee(agents, "round_robin", "desconhecido")).toBe("a");
  });

  it("retorna null quando não há agentes", () => {
    expect(pickNextAssignee([], "least_busy")).toBeNull();
    expect(pickNextAssignee([], "round_robin", "a")).toBeNull();
  });
});
