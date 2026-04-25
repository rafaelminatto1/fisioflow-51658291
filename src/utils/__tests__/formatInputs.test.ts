import { describe, it, expect } from "vitest";
import { formatCPF, formatPhoneInput, shouldFormatPhoneField } from "../formatInputs";

describe("formatInputs", () => {
  describe("formatCPF", () => {
    it("deve formatar CPF completo corretamente", () => {
      expect(formatCPF("12345678901")).toBe("123.456.789-01");
    });

    it("deve formatar CPF parcial (3 dígitos)", () => {
      expect(formatCPF("123")).toBe("123");
    });

    it("deve formatar CPF parcial (6 dígitos)", () => {
      expect(formatCPF("123456")).toBe("123.456");
    });

    it("deve formatar CPF parcial (9 dígitos)", () => {
      expect(formatCPF("123456789")).toBe("123.456.789");
    });

    it("deve remover caracteres não numéricos antes de formatar", () => {
      expect(formatCPF("123.456.789-01")).toBe("123.456.789-01");
      expect(formatCPF("123456789-01")).toBe("123.456.789-01");
    });

    it("deve retornar string vazia para valor null", () => {
      expect(formatCPF(null as any)).toBe("");
    });

    it("deve retornar string vazia para valor undefined", () => {
      expect(formatCPF(undefined as any)).toBe("");
    });

    it("deve retornar string vazia para string vazia", () => {
      expect(formatCPF("")).toBe("");
    });

    it("deve truncar para 11 dígitos se mais caracteres", () => {
      expect(formatCPF("123456789012345")).toBe("123.456.789-01");
    });
  });

  describe("formatPhoneInput", () => {
    it("deve formatar celular completo corretamente (11 dígitos)", () => {
      expect(formatPhoneInput("11987654321")).toBe("(11) 98765-4321");
    });

    it("deve formatar telefone fixo completo corretamente (10 dígitos)", () => {
      expect(formatPhoneInput("1134567890")).toBe("(11) 3456-7890");
    });

    it("deve formatar telefone parcial (2 dígitos)", () => {
      expect(formatPhoneInput("11")).toBe("(11");
    });

    it("deve formatar telefone parcial (7 dígitos)", () => {
      expect(formatPhoneInput("1198765")).toBe("(11) 98765");
    });

    it("deve remover caracteres não numéricos antes de formatar", () => {
      expect(formatPhoneInput("(11) 98765-4321")).toBe("(11) 98765-4321");
      expect(formatPhoneInput("11987654321")).toBe("(11) 98765-4321");
    });

    it("deve retornar string vazia para valor null", () => {
      expect(formatPhoneInput(null as any)).toBe("");
    });

    it("deve retornar string vazia para valor undefined", () => {
      expect(formatPhoneInput(undefined as any)).toBe("");
    });

    it("deve retornar string vazia para string vazia", () => {
      expect(formatPhoneInput("")).toBe("");
    });

    it("deve formatar corretamente com DDD e número", () => {
      expect(formatPhoneInput("21912345678")).toBe("(21) 91234-5678");
      expect(formatPhoneInput("4834567890")).toBe("(48) 3456-7890");
    });

    it("deve truncar para 11 dígitos se mais caracteres", () => {
      expect(formatPhoneInput("1198765432112345")).toBe("(11) 98765-4321");
    });

    it("deve formatar telefone brasileiro com DDI 55", () => {
      expect(formatPhoneInput("5511987654321")).toBe("+55 (11) 98765-4321");
      expect(formatPhoneInput("+55 (11) 98765-4321")).toBe("+55 (11) 98765-4321");
    });
  });

  describe("shouldFormatPhoneField", () => {
    it("detecta campos de telefone por tipo, nome e id", () => {
      expect(shouldFormatPhoneField({ type: "tel" })).toBe(true);
      expect(shouldFormatPhoneField({ id: "telefone" })).toBe(true);
      expect(shouldFormatPhoneField({ name: "doctor_phone" })).toBe(true);
      expect(shouldFormatPhoneField({ name: "newPhoneNumber" })).toBe(true);
    });

    it("detecta placeholders de telefone sem afetar campos de busca ou link", () => {
      expect(shouldFormatPhoneField({ placeholder: "(00) 00000-0000" })).toBe(true);
      expect(shouldFormatPhoneField({ placeholder: "Ex: 11999999999" })).toBe(true);
      expect(shouldFormatPhoneField({ id: "link_whatsapp" })).toBe(false);
      expect(
        shouldFormatPhoneField({
          type: "search",
          placeholder: "Buscar por telefone",
        }),
      ).toBe(false);
    });
  });
});
