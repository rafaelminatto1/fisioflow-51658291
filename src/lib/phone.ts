/**
 * Utilidades de telefone BR (frontend). Espelha a lógica do backend
 * (apps/api/src/lib/whatsapp-identity.ts) para casar contatos por número
 * independente de 55 e do 9º dígito de celular.
 */

export function onlyDigits(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

/** Só-dígitos com comprimento de telefone (10–13). Exclui webchat/IGSID. */
export function looksLikePhone(value: string): boolean {
  return /^\d{10,13}$/.test(onlyDigits(value));
}

/**
 * Chave canônica para COMPARAÇÃO/dedup: remove 55 e o 9º dígito de celular,
 * de modo que "11993524648", "5511993524648" e "551193524648" colidam.
 */
export function canonicalBrazilPhone(raw: string): string {
  const digits = onlyDigits(raw);
  if (!/^\d{10,13}$/.test(digits)) return digits;
  let national = digits;
  if (national.length >= 12 && national.startsWith("55")) {
    national = national.slice(2);
  }
  if (national.length === 10 || national.length === 11) {
    const ddd = national.slice(0, 2);
    let sub = national.slice(2);
    if (sub.length === 9 && sub.startsWith("9")) {
      sub = sub.slice(1);
    }
    return "55" + ddd + sub;
  }
  return digits;
}

/** Formata para exibição: "+55 11 99352-4648". */
export function formatBrazilPhone(raw: string): string {
  let digits = onlyDigits(raw);
  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return onlyDigits(raw);
}
