export function maskPhone(phone?: string | null) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return undefined;
  return `${digits.slice(0, 4)}...${digits.slice(-4)}`;
}
