export interface RedactionResult {
  text: string;
  redactedEntities: string[];
}

export function redactPII(text: string): RedactionResult {
  let sanitized = text;
  const redactedEntities = new Set<string>();

  // 1. Telefone (BR)
  const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})\b/g;
  if (phoneRegex.test(sanitized)) {
    sanitized = sanitized.replace(phoneRegex, "[TELEFONE REMOVIDO]");
    redactedEntities.add("TELEFONE");
  }

  // 2. CPF (matching formats like 123.456.789-00 or 12345678900)
  const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
  if (cpfRegex.test(sanitized)) {
    sanitized = sanitized.replace(cpfRegex, "[CPF REMOVIDO]");
    redactedEntities.add("CPF");
  }

  // 2. RG (approximate format)
  const rgRegex = /\b\d{1,2}\.?\d{3}\.?\d{3}-?[0-9X]\b/gi;
  if (rgRegex.test(sanitized)) {
    sanitized = sanitized.replace(rgRegex, "[RG REMOVIDO]");
    redactedEntities.add("RG");
  }

  // 3. Email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
  if (emailRegex.test(sanitized)) {
    sanitized = sanitized.replace(emailRegex, "[EMAIL REMOVIDO]");
    redactedEntities.add("EMAIL");
  }



  return {
    text: sanitized,
    redactedEntities: Array.from(redactedEntities),
  };
}

export function replacePatientName(text: string, patientName: string, substitution: string = "Paciente"): string {
  if (!patientName) return text;
  
  let sanitized = text;
  const cleanName = patientName.trim();
  
  // Replace full name
  const fullNameRegex = new RegExp(`\\b${cleanName}\\b`, 'gi');
  sanitized = sanitized.replace(fullNameRegex, substitution);
  
  // Replace parts of the name (first name, last name) if length > 2
  const nameParts = cleanName.split(" ").filter(p => p.length > 2);
  for (const part of nameParts) {
    const partRegex = new RegExp(`\\b${part}\\b`, 'gi');
    sanitized = sanitized.replace(partRegex, substitution);
  }
  
  return sanitized;
}
