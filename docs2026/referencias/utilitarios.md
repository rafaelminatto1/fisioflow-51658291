# Referência: Funções Utilitárias

## Formatação

```typescript
// lib/format.ts

// Moeda (BRL)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Data
export function formatDate(date: string | Date): string {
  return new Intl.DateFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

// Data e hora
export function formatDateTime(date: string | Date): string {
  return new Intl.DateFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Telefone
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

// CPF
export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// CEP
export function formatCEP(cep: string): string {
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
}
```

## Validação

```typescript
// lib/validate.ts

// Email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// CPF
export function isValidCPF(cpf: string): boolean {
  // Algoritmo de validação de CPF
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  // ... resto do algoritmo
}

// Telefone
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
}

// CNPJ
export function isValidCNPJ(cnpj: string): boolean {
  // Algoritmo de validação de CNPJ
  // ...
}
```

## Cálculos

```typescript
// lib/calculations.ts

// Idade
export function calculateAge(birthDate: string | Date): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// IMC
export function calculateBMI(weight: number, height: number): number {
  return weight / ((height / 100) ** 2);
}

// Taxa metabólica basal (Mifflin-St Jeor)
export function calculateBMR(weight: number, height: number, age: number, gender: 'male' | 'female'): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

// TMB
export function calculateTMR(bmr: number, activityLevel: number): number {
  return bmr * activityLevel;
}
```

## Manipulação de Dados

```typescript
// lib/data.ts

// Ordenar por nome
export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

// Filtrar por termo de busca
export function filterBySearchTerm<T extends { name: string }>(items: T[], term: string): T[] {
  const lowerTerm = term.toLowerCase();
  return items.filter(item => item.name.toLowerCase().includes(lowerTerm));
}

// Group by
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// Unique
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

// Chunk
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

## Strings

```typescript
// lib/string.ts

// Slugify
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Truncate
export function truncate(text: string, length: number, suffix: string = '...'): string {
  if (text.length <= length) return text;
  return text.substring(0, length - suffix.length) + suffix;
}

// Capitalize
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Iniciais
export function initials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
```

## Arrays

```typescript
// lib/array.ts

// Shuffle
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Random
export function random<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Sum
export function sum(array: number[]): number {
  return array.reduce((acc, val) => acc + val, 0);
}

// Average
export function average(array: number[]): number {
  return sum(array) / array.length;
}
```

## CN (Utility Function)

```typescript
// lib/utils.ts (shadcn/ui)

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Uso
cn('px-4 py-2', isActive && 'bg-primary', 'hover:bg-accent')
```

## Veja Também

- [Validações](./validacoes.md) - Schemas Zod
- [Hooks Customizados](./hooks-customizados.md) - Hooks que usam utilitários
