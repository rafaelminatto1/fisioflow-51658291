# Próximos Passos - FisioFlow AI Studio

**Data:** 2026-02-09
**Status:** 📋 Em Progresso

---

## Resumo Executivo

| Tipo de Teste | Total | Passando | Falhando | % Passando |
|---------------|-------|----------|----------|------------|
| **Unitários (Vitest)** | 288 | 288 | 0 | **100%** ✅ |
| **E2E (Playwright)** | ~60 | 7 | ~53 | **~12%** ⚠️ |

---

## ✅ Fase 1: Testes Unitários - CONCLUÍDA

### Status Final
- **288/288 testes passando (100%)**
- Todas as correções aplicadas:
  - Exclusão de `professional-app/` e `patient-app/` do Vitest
  - Correção de schemas de validação (participante, prestador, checklist)
  - Correção de testes de componentes e utilitários

---

## 🔄 Fase 2: Testes E2E - EM ANDAMENTO

### ✅ Concluído

1. **Correção de regex quebrada em testes E2E**
   - Arquivo: `e2e/integration.spec.ts` e outros
   - Problema: `waitForURL(/\/(eventos|dashboard|waitForURL(...))`
   - Solução: Regex corrigida para `/\/(\?|schedule|patients|dashboard|eventos)?/`

2. **Testes de Autenticação (5/5 passando)** ✅
   - Arquivo: `e2e/auth.spec.ts`
   - Correções:
     - Atualização da regex de espera após login
     - Correção do seletor do menu do usuário (`[data-testid="user-menu"]`)
     - Ajuste do fluxo de logout para usar `[role="menuitem"]`

### ⚠️ Problemas Identificados

#### 1. Testes de Dashboard (4/4 falhando)
- **Problema:** Elementos da interface não correspondem aos seletores
- **Arquivo:** `e2e/dashboard.spec.ts`
- **Exemplo:** `h1:has-text("Pacientes")` não encontrado

#### 2. Testes de Pacientes (8/8 falhando)
- **Problema:** Componentes reestruturados
- **Arquivo:** `e2e/patients.spec.ts`
- **Exemplo:** `button:has-text("Novo Paciente")` não encontrado

#### 3. Testes de Agenda (9/9 falhando)
- **Problema:** Componentes de agenda reformulados
- **Arquivo:** `e2e/agenda.spec.ts`
- **Exemplo:** Estrutura de calendário mudou

---

## 🎯 Próximos Passos Prioritários

### Alta Prioridade

#### 1. Atualizar seletores dos testes de Dashboard
**Arquivo:** `e2e/dashboard.spec.ts`

**Ações:**
- Inspecionar a página de dashboard para encontrar seletores corretos
- Verificar se há elementos com `data-testid` apropriados
- Atualizar testes para usar seletores mais robustos

**Estimativa:** 30 minutos

#### 2. Atualizar seletores dos testes de Pacientes
**Arquivo:** `e2e/patients.spec.ts`

**Ações:**
- Mapear a estrutura atual da página de pacientes
- Encontrar botões e formulários corretos
- Atualizar seletores para componentes Shadcn/UI

**Estimativa:** 45 minutos

#### 3. Atualizar seletores dos testes de Agenda
**Arquivo:** `e2e/agenda.spec.ts`

**Ações:**
- Verificar componentes de calendário (`CalendarWeekView`)
- Atualizar seletores de cards de agendamento
- Corrigir testes de drag-and-drop

**Estimativa:** 60 minutos

### Média Prioridade

#### 4. Adicionar data-testid aos componentes principais
**Arquivos:**
- `src/pages/Dashboard.tsx`
- `src/pages/Patients.tsx`
- `src/components/schedule/CalendarWeekView.tsx`

**Benefícios:**
- Testes mais robustos
- Menor manutenção a longo prazo
- Melhor acessibilidade

**Estimativa:** 1 hora

#### 5. Executar testes em lote com Firebase Emulator
**Script:** `scripts/run-e2e-with-emulator.sh`

**Ações:**
- Garantir que Firebase Emulators estão funcionando
- Executar todos os testes E2E com emulador
- Documentar resultados

---

## 📊 Progresso Detalhado

### Testes que funcionam:
| Teste | Status |
|-------|--------|
| `auth.spec.ts` (5 testes) | ✅ 5/5 passando |
| `performance.spec.ts` (parcial) | ⚠️ 5/9 passando |

### Testes precisando de correção:
| Teste | Problemas |
|-------|-----------|
| `dashboard.spec.ts` | Seletores desatualizados |
| `patients.spec.ts` | Componentes reformulados |
| `agenda.spec.ts` | Estrutura de calendário mudou |
| `accessibility.spec.ts` | Precisa verificar |
| `eventos.spec.ts` | Precisa verificar |
| `checklist.spec.ts` | Precisa verificar |
| `integration.spec.ts` | Precisa verificar |

---

## 🔧 Comandos Úteis

### Executar testes específicos
```bash
# Autenticação (funcionando)
npx playwright test e2e/auth.spec.ts --project=chromium --workers=1

# Dashboard (precisa correção)
npx playwright test e2e/dashboard.spec.ts --project=chromium --workers=1

# Pacientes (precisa correção)
npx playwright test e2e/patients.spec.ts --project=chromium --workers=1

# Agenda (precisa correção)
npx playwright test e2e/agenda.spec.ts --project=chromium --workers=1
```

### Debug visual
```bash
# Com modo headed para ver o navegador
npx playwright test e2e/auth.spec.ts --project=chromium --headed

# Com modo UI interativo
npx playwright test --ui
```

### Ver relatório
```bash
# Abrir relatório HTML
npx playwright show-report
```

---

## 📝 Checklist

- [x] Fase 1: Testes unitários (288/288)
- [x] Corrigir regex quebrada em testes E2E
- [x] Corrigir testes de autenticação (5/5)
- [ ] Atualizar seletores do dashboard
- [ ] Atualizar seletores de pacientes
- [ ] Atualizar seletores de agenda
- [ ] Adicionar data-testid aos componentes principais
- [ ] Executar todos os testes E2E com emulador

---

**Gerado em:** 2026-02-09
**Próxima revisão:** Após correção dos seletores
