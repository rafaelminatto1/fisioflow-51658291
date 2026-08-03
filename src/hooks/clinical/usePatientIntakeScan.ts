import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/api/v2/base";

/**
 * Digitalização da ficha física de cadastro (`/api/clinical/intake`).
 *
 * 997 de 1.022 pacientes não têm telefone porque a ficha de cadastro é de papel
 * — o export do sistema antigo trazia 23 celulares em 1.034 pacientes, então não
 * há o que reimportar. O caminho é fotografar a ficha, ler por OCR e conferir.
 *
 * Duas chamadas SEPARADAS de propósito: `scan` não grava nada. Telefone lido de
 * foto e escrito direto no cadastro seria dado não verificado apresentado como
 * fato, e um dígito trocado vira mensagem para a pessoa errada. A gravação só
 * acontece em `apply`, com os valores que alguém conferiu com a ficha na mão.
 */

export type IntakeField =
  | "telefone"
  | "telefone_secundario"
  | "cpf"
  | "data_nascimento"
  | "cep"
  | "email";

export interface IntakeCandidate {
  field: IntakeField;
  /** Valor já normalizado pelo servidor (dígitos, ISO em data). */
  value: string;
  /** Trecho literal do OCR que originou o valor — sem ele a confiança não é verificável. */
  sourceText: string;
  sourceStart: number;
  sourceEnd: number;
  /** 0–1. Reflete a incerteza do OCR, não da regra de extração. */
  confidence: number;
}

export interface IntakeScanData {
  patientId: string | null;
  candidatos: IntakeCandidate[];
  textoOcr: string;
  caracteresLidos: number;
}

export interface IntakeScanResponse {
  data: IntakeScanData;
  meta: {
    confiancaMinima: number;
    /** Texto do servidor deixando explícito que nada foi gravado. Exibir literalmente. */
    aviso: string;
  };
}

export interface IntakeScanInput {
  file: File;
  patientId?: string | null;
}

export interface ApplyIntakeInput {
  patientId: string;
  telefone?: string | null;
  telefoneSecundario?: string | null;
  cpf?: string | null;
  /** `YYYY-MM-DD`. */
  dataNascimento?: string | null;
  email?: string | null;
}

export interface ApplyIntakeResponse {
  data: {
    patientId: string;
    aplicados: string[];
    /** Campos que já tinham valor no cadastro e NÃO foram sobrescritos. */
    ignorados: string[];
  };
  meta: { aviso?: string };
}

/** Limite do endpoint. Barrar aqui evita subir 8 MB para receber 413. */
export const INTAKE_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Campos que o `apply` sabe gravar.
 *
 * `cep` é extraído pelo OCR mas fica de fora: `patients` não tem coluna de CEP
 * (o endereço é um campo único), então ele só serve como informação de tela.
 */
export const CAMPOS_APLICAVEIS: readonly IntakeField[] = [
  "telefone",
  "telefone_secundario",
  "cpf",
  "data_nascimento",
  "email",
];

export function campoEhAplicavel(field: IntakeField): boolean {
  return CAMPOS_APLICAVEIS.includes(field);
}

/**
 * Envia a foto/PDF da ficha e devolve os candidatos para revisão.
 *
 * O corpo é multipart: `request()` detecta `FormData` e omite o
 * `Content-Type`, deixando o browser montar o boundary. Passar
 * `Content-Type: multipart/form-data` na mão quebraria o parse no servidor.
 */
export function useScanIntakeSheet() {
  return useMutation({
    mutationFn: async ({ file, patientId }: IntakeScanInput) => {
      if (file.size > INTAKE_MAX_BYTES) {
        throw new Error("Arquivo acima de 8 MB. Fotografe a ficha com menos resolução.");
      }
      const form = new FormData();
      form.append("file", file);
      if (patientId) form.append("patientId", patientId);

      return request<IntakeScanResponse>("/api/clinical/intake/scan", {
        method: "POST",
        body: form,
      });
    },
  });
}

/** Grava os campos conferidos. Só preenche coluna vazia — o resto volta em `ignorados`. */
export function useApplyIntakeFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ApplyIntakeInput) =>
      request<ApplyIntakeResponse>("/api/clinical/intake/apply", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_res, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      void queryClient.invalidateQueries({ queryKey: ["patient", variables.patientId] });
    },
  });
}
