---
name: fisioflow-cpf-cnpj
description: Reference for Brazilian document validation and formatting utilities used in FisioFlow. Use when implementing or reviewing CPF, CNPJ, CEP, phone, RG, or CRM validation behavior.
---

# FisioFlow Brazilian Document Validation

Validation and formatting utilities for Brazilian documents used throughout the FisioFlow physiotherapy clinic system. Covers CPF, CNPJ, CEP, phone numbers, RG identity cards, and CRM medical licenses.

All validators follow the same contract:
- **validate(input: string): boolean** — returns `true` if the input is structurally valid
- **format(input: string): string** — returns the formatted representation, throws on invalid input
- **clean(input: string): string** — strips all non-digit characters

---

## CPF (Cadastro de Pessoas Físicas)

Individual taxpayer ID. 11 digits with two mod-11 check digits.

**Format:** `XXX.XXX.XXX-XX`

**Validation Algorithm:**

1. Strip non-digits, resulting in 11 digits
2. Reject known fake patterns (all same digit: `00000000000` through `99999999999`)
3. First check digit (10th):
   - Multiply first 9 digits by weights `[10, 9, 8, 7, 6, 5, 4, 3, 2]`
   - Sum products, compute `remainder = sum % 11`
   - Digit = `remainder < 2 ? 0 : 11 - remainder`
4. Second check digit (11th):
   - Multiply first 10 digits by weights `[11, 10, 9, 8, 7, 6, 5, 4, 3, 2]`
   - Same formula as above

```typescript
function cleanCpf(input: string): string {
  return input.replace(/\D/g, "");
}

function validateCpf(input: string): boolean {
  const cpf = cleanCpf(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcCheckDigit = (slice: string, weights: number[]): number => {
    const sum = slice
      .split("")
      .reduce((acc, digit, i) => acc + parseInt(digit) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcCheckDigit(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calcCheckDigit(
    cpf.slice(0, 10),
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return (
    parseInt(cpf.charAt(9)) === firstDigit &&
    parseInt(cpf.charAt(10)) === secondDigit
  );
}

function formatCpf(input: string): string {
  const cpf = cleanCpf(input);
  if (!validateCpf(cpf)) throw new Error("Invalid CPF");
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
```

**Common Patterns in FisioFlow:**
- Patient registration form (required field)
- Health insurance billing (must be valid CPF)
- Invoice generation for private sessions
- Store as digits only in database, format only on display

---

## CNPJ (Cadastro Nacional da Pessoa Jurídica)

Legal entity taxpayer ID. 14 digits with two mod-11 check digits.

**Format:** `XX.XXX.XXX/XXXX-XX`

**Validation Algorithm:**

1. Strip non-digits, resulting in 14 digits
2. Reject all-same-digit patterns
3. First check digit (13th):
   - Multiply first 12 digits by weights `[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]`
   - Sum products, compute `remainder = sum % 11`
   - Digit = `remainder < 2 ? 0 : 11 - remainder`
4. Second check digit (14th):
   - Multiply first 13 digits by weights `[6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]`
   - Same formula as above

```typescript
function cleanCnpj(input: string): string {
  return input.replace(/\D/g, "");
}

function validateCnpj(input: string): boolean {
  const cnpj = cleanCnpj(input);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calcCheckDigit = (slice: string, weights: number[]): number => {
    const sum = slice
      .split("")
      .reduce((acc, digit, i) => acc + parseInt(digit) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcCheckDigit(
    cnpj.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const secondDigit = calcCheckDigit(
    cnpj.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return (
    parseInt(cnpj.charAt(12)) === firstDigit &&
    parseInt(cnpj.charAt(13)) === secondDigit
  );
}

function formatCnpj(input: string): string {
  const cnpj = cleanCnpj(input);
  if (!validateCnpj(cnpj)) throw new Error("Invalid CNPJ");
  return cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}
```

**Common Patterns in FisioFlow:**
- Clinic registration (the clinic's own CNPJ)
- Health insurance provider identification
- Supplier/vendor management
- NFSe (Nota Fiscal de Serviços Eletrônica) emission

---

## CEP (Código de Endereçamento Postal)

Brazilian ZIP code. 8 digits.

**Format:** `XXXXX-XXX`

**ViaCEP API Lookup:**

```
GET https://viacep.com.br/ws/{cep}/json/
```

Returns: `{ cep, logradouro, complemento, bairro, localidade, uf, ibge, gia, ddd, siafi }`

```typescript
function cleanCep(input: string): string {
  return input.replace(/\D/g, "");
}

function validateCep(input: string): boolean {
  const cep = cleanCep(input);
  return /^\d{8}$/.test(cep);
}

function formatCep(input: string): string {
  const cep = cleanCep(input);
  if (!validateCep(cep)) throw new Error("Invalid CEP");
  return cep.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  ddd: string;
}

async function lookupCep(input: string): Promise<ViaCepResponse> {
  const cep = cleanCep(input);
  if (!validateCep(cep)) throw new Error("Invalid CEP");
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) throw new Error("CEP lookup failed");
  const data = await response.json();
  if (data.erro) throw new Error("CEP not found");
  return data;
}
```

**Common Patterns in FisioFlow:**
- Patient address auto-fill on registration
- Clinic branch location
- Automatic UF/state resolution from address
- Chain: user enters CEP → auto-fill street, neighborhood, city, state → user adds number

---

## Phone Numbers

Brazilian phone numbers. 10 digits (landline) or 11 digits (mobile with 9th digit).

**Format:** `(XX) XXXXX-XXXX` (mobile) or `(XX) XXXX-XXXX` (landline)

**DDD codes** are 2-digit area codes (11-99 range).

**Validation Rules:**
- Mobile: 11 digits, 3rd digit (after DDD) must be `9`, 4th digit must be `[6-9]`
- Landline: 10 digits, 3rd digit must be `[2-5]`
- DDD (first 2 digits): valid range 11-99, not all combinations are real but structural check is sufficient

```typescript
function cleanPhone(input: string): string {
  return input.replace(/\D/g, "");
}

function validatePhone(input: string): boolean {
  const phone = cleanPhone(input);
  if (phone.length === 11) {
    return /^[1-9]\d([9])[6-9]\d{7}$/.test(phone);
  }
  if (phone.length === 10) {
    return /^[1-9]\d[2-5]\d{7}$/.test(phone);
  }
  return false;
}

function validateMobile(input: string): boolean {
  const phone = cleanPhone(input);
  return phone.length === 11 && /^[1-9]\d9[6-9]\d{7}$/.test(phone);
}

function validateLandline(input: string): boolean {
  const phone = cleanPhone(input);
  return phone.length === 10 && /^[1-9]\d[2-5]\d{7}$/.test(phone);
}

function formatPhone(input: string): string {
  const phone = cleanPhone(input);
  if (phone.length === 11) {
    return phone.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (phone.length === 10) {
    return phone.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  throw new Error("Invalid phone number");
}
```

**Common Patterns in FisioFlow:**
- Patient contact (mobile required for WhatsApp appointment reminders)
- Emergency contact field
- Clinic phone numbers (landline or mobile)
- SMS appointment notifications — always validate as mobile before sending

---

## RG (Registro Geral / Identity Card)

State-issued identity card. Format varies by state (UF).

**Format varies by state:**

| State | Format | Example |
|-------|--------|---------|
| SP | `XX.XXX.XXX-X` | `12.345.678-9` |
| RJ | `XX.XXX.XXX-X` | `12.345.678-9` |
| MG | `XXX.XXX.XXX-X` | `123.456.789-0` (9 digits, but can be up to 11) |
| PR | `X.XXX.XXX-X` (7-9 digits) | `1.234.567-8` |
| RS | `XXXXXXXXX-X` (10 digits) | `1234567890-1` |
| BA | `XXXXXXX-XX` (8 digits + 2 check) | `1234567-89` |

**General rule:** 7–14 characters including formatting. No single nationwide algorithm. FisioFlow validates structure only (digits + separators), with optional state-specific formatting.

```typescript
function cleanRg(input: string): string {
  return input.replace(/[^\dXx]/g, "").toUpperCase();
}

function validateRg(input: string): boolean {
  const rg = cleanRg(input);
  if (rg.length < 7 || rg.length > 14) return false;
  return /^[\dX]+$/.test(rg);
}

function validateRgSp(input: string): boolean {
  const rg = cleanRg(input);
  if (rg.length !== 9) return false;
  const digits = rg.split("").map((d) => (d === "X" ? 10 : parseInt(d)));
  const sum = digits.slice(0, 8).reduce((acc, d, i) => acc + d * (i + 2), 0);
  const remainder = sum % 11;
  const checkDigit = 11 - remainder;
  const expected = checkDigit === 10 ? "X" : checkDigit === 11 ? "0" : String(checkDigit);
  return rg.charAt(8) === expected;
}

function formatRgSp(input: string): string {
  const rg = cleanRg(input);
  if (rg.length !== 9) throw new Error("Invalid RG for SP");
  return rg.replace(/^(\d{2})(\d{3})(\d{3})([\dX])$/, "$1.$2.$3-$4");
}

function formatRgGeneric(input: string): string {
  const rg = cleanRg(input);
  if (!validateRg(rg)) throw new Error("Invalid RG");
  return input.trim();
}
```

**Common Patterns in FisioFlow:**
- Patient identification (secondary document after CPF)
- Health insurance plan registration often requires RG
- Store raw digits + issuing state (UF)
- Display formatted according to issuing state

---

## CRM (Conselho Regional de Medicina)

Medical license number issued by Regional Medical Councils. Required for doctors who prescribe treatments in the physiotherapy workflow.

**Format:** `CRM/UF XXXXX` — numeric part varies (1–6 digits), UF is the 2-letter state code.

**Examples:**
- `CRM/SP 12345`
- `CRM/RJ 98765`
- `CRM/MG 54321`

```typescript
const BRAZILIAN_UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

type BrazilianUF = (typeof BRAZILIAN_UFS)[number];

function cleanCrm(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function validateCrm(input: string): boolean {
  const normalized = cleanCrm(input).toUpperCase();
  const match = normalized.match(/^CRM\/([A-Z]{2})\s+(\d{1,6})$/);
  if (!match) return false;
  const [, uf, number] = match;
  return (BRAZILIAN_UFS as readonly string[]).includes(uf) && parseInt(number) > 0;
}

function parseCrm(input: string): { uf: BrazilianUF; number: number } {
  const normalized = cleanCrm(input).toUpperCase();
  const match = normalized.match(/^CRM\/([A-Z]{2})\s+(\d{1,6})$/);
  if (!match || !(BRAZILIAN_UFS as readonly string[]).includes(match[1])) {
    throw new Error("Invalid CRM");
  }
  return { uf: match[1] as BrazilianUF, number: parseInt(match[2]) };
}

function formatCrm(uf: string, number: number): string {
  const upperUf = uf.toUpperCase();
  if (!(BRAZILIAN_UFS as readonly string[]).includes(upperUf)) {
    throw new Error("Invalid UF");
  }
  if (number <= 0 || !Number.isInteger(number)) {
    throw new Error("Invalid CRM number");
  }
  return `CRM/${upperUf} ${number}`;
}
```

**Common Patterns in FisioFlow:**
- Prescribing physician registration (doctors who refer patients to physiotherapy)
- Appears on treatment prescriptions and medical reports
- Required field when linking a treatment plan to a medical referral
- Display as `CRM/UF XXXXX` everywhere; store as `{ uf, number }` in database

---

## Database Storage Conventions

| Document | DB Column Type | Storage Format | Display Format |
|----------|---------------|----------------|----------------|
| CPF | `VARCHAR(11)` | Digits only | `XXX.XXX.XXX-XX` |
| CNPJ | `VARCHAR(14)` | Digits only | `XX.XXX.XXX/XXXX-XX` |
| CEP | `VARCHAR(8)` | Digits only | `XXXXX-XXX` |
| Phone | `VARCHAR(11)` | Digits only | `(XX) XXXXX-XXXX` |
| RG | `VARCHAR(20)` | Digits only + issuing UF | State-specific |
| CRM | Two columns: `crm_number INT`, `crm_uf CHAR(2)` | Structured | `CRM/UF XXXXX` |

---

## Reusable Utility

```typescript
function applyMask(value: string, mask: string): string {
  const digits = value.replace(/\D/g, "");
  let result = "";
  let digitIndex = 0;
  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    if (mask[i] === "X") {
      result += digits[digitIndex];
      digitIndex++;
    } else {
      result += mask[i];
    }
  }
  return result;
}

function removeMask(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

const MASKS = {
  CPF: "XXX.XXX.XXX-XX",
  CNPJ: "XX.XXX.XXX/XXXX-XX",
  CEP: "XXXXX-XXX",
  PHONE_MOBILE: "(XX) XXXXX-XXXX",
  PHONE_LANDLINE: "(XX) XXXX-XXXX",
  RG_SP: "XX.XXX.XXX-X",
} as const;
```

---

## FisioFlow Integration Points

These validators are used in:

1. **Patient Registration Form** — CPF (required), RG, phone, CEP with auto-fill
2. **Doctor/Prescriber Management** — CRM validation, CPF
3. **Health Insurance Partner Setup** — CNPJ, phone, CEP
4. **Clinic Profile** — CNPJ, CEP, phone numbers
5. **Invoice/NFSe Generation** — CPF/CNPJ of patient or insurance, clinic CNPJ
6. **Appointment Notifications** — Phone validation (must be mobile for WhatsApp/SMS)

Always validate on both client-side (immediate feedback) and server-side (data integrity). Use `clean*` functions before persisting to the database. Use `format*` functions only when rendering to the UI or generating PDFs.
