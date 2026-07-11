import type { SoapFields } from "@/hooks/useVoiceScribe";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Converte o retorno do AI Scribe (contrato SOAP legado — o ditado livre vem
 * em `subjective`) em parágrafos HTML para o editor de observação clínica.
 */
export function soapToObservacaoHtml(soap: SoapFields): string {
  return [soap.subjective, soap.objective, soap.assessment, soap.plan]
    .map((t) => (t || "").trim())
    .filter(Boolean)
    .map((t) => `<p>${escapeHtml(t)}</p>`)
    .join("");
}
