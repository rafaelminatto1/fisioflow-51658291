import { describe, it, expect } from "vitest";
import { maskPhone } from "../phone";

describe("maskPhone", () => {
  it("mascara um celular BR normal", () => {
    expect(maskPhone("+5511987654321")).toBe("5511...4321");
  });

  it("mascara um valor curto/malformado", () => {
    expect(maskPhone("123")).toBe("123...123");
  });

  it("retorna undefined para string vazia", () => {
    expect(maskPhone("")).toBeUndefined();
  });

  it("retorna undefined para undefined", () => {
    expect(maskPhone(undefined)).toBeUndefined();
  });
});
