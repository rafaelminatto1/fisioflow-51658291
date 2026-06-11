# RELATÓRIO CONSOLIDADO - CORREÇÕES DO SISTEMA

## DATA: 2025-02-01
## STATUS: INVESTIGAÇÃO COMPLETA

---

## RESUMO EXECUTIVO

Foram analisados **todos os fluxos principais** do sistema FisioFlow. Identificados **9 problemas** que requerem correção imediata, sendo **2 CRÍTICOS** relacionados ao React Error #185.

---

## PROBLEMAS CRÍTICOS (Prioridade ALTA)

### #001 - React Error #185 em Agendamentos
**Arquivo:** `src/components/schedule/AppointmentModalRefactored.tsx:225-236`

**Problema:** useEffect com dependência instável (`checkPatientHasPreviousSessions`)

**Código:**
```tsx
useEffect(() => {
  if (!appointment && isOpen && watchedPatientId && currentMode === 'create') {
    const hasPreviousSessions = checkPatientHasPreviousSessions(watchedPatientId);
    // setValue chamado aqui pode causar loop
  }
}, [watchedPatientId, isOpen, appointment, currentMode, setValue, checkPatientHasPreviousSessions]);
```

**Correção:**
```tsx
const checkPatientHasPreviousSessionsRef = useRef(checkPatientHasPreviousSessions);
checkPatientHasPreviousSessionsRef.current = checkPatientHasPreviousSessions;

useEffect(() => {
  if (!appointment && isOpen && watchedPatientId && currentMode === 'create') {
    const hasPreviousSessions = checkPatientHasPreviousSessionsRef.current(watchedPatientId);
    // ...
  }
}, [watchedPatientId, isOpen, appointment, currentMode, setValue]);
```

---

### #002 - Dupla chamada de estado em AppointmentQuickView
**Arquivo:** `src/components/schedule/AppointmentQuickView.tsx:307-324`

**Problema:** `onClick` dentro do `DrawerTrigger asChild` que já chama `onOpenChange`

**Código:**
```tsx
<Drawer open={open} onOpenChange={onOpenChange}>
  <DrawerTrigger asChild>
    <span
      className="contents"
      onClick={(e) => {
        e.stopPropagation();
        onOpenChange?.(true);  // ← DUPLICAÇÃO!
      }}
    >
      {children}
    </span>
  </DrawerTrigger>
```

**Correção:**
```tsx
<Drawer open={open} onOpenChange={onOpenChange}>
  <DrawerTrigger asChild>
    <span className="contents" role="button" tabIndex={0}>
      {children}
    </span>
  </DrawerTrigger>
```

---

### #005 - Migração Incompleta Supabase → Firebase
**Arquivo:** `src/components/modals/NewPatientModal.tsx:192-196`

**Problema:** Ainda usa Supabase para criar pacientes

**Correção:** Migrar para Firebase conforme padrão do sistema

---

## PROBLEMAS MÉDIOS (Prioridade MÉDIA)

### #003 - Dupla chamada de onOpenPopover
**Arquivo:** `src/components/schedule/CalendarAppointmentCard.tsx:415-427`

**Problema:** `cardContent` tem onClick que chama `onOpenPopover`, mas o wrapper também chama

**Correção:** Remover onClick do cardContent

---

### #004 - Padrão incorreto asChild + onClick
**Arquivo:** `src/components/protocols/ProtocolCardEnhanced.tsx:92, :159`

**Problema:** `onClick` no `DropdownMenuTrigger` (deve estar no Button filho)

**Correção:**
```tsx
<DropdownMenuTrigger asChild>
  <Button onClick={(e) => e.stopPropagation()}>
```

---

### #008 - useEffect com debounce em Observação Livre
**Arquivo:** `src/components/evolution/SOAPFormPanel.tsx:112-117`

**Problema:** Padrão de debounce misturado com useEffect pode causar loops

**Correção:** Implementar debounce com timeout na handleChange

---

## PROBLEMAS BAIXOS (Otimização)

### #006 - Invalidation excessiva de queries
**Impacto:** Performance

**Correção:** Agrupar invalidações ou usar invalidateQueries seletivo

---

### #007 - Otimização de cache
**Arquivo:** `src/hooks/useExerciseProtocols.ts`

**Problema:** gcTime de 24h pode ser muito longo

**Correção:** Ajustar para 5-30 minutos dependendo da frequência de mudanças

---

### #009 - Testes usando Supabase
**Impacto:** Testes não funcionam

**Correção:** Migrar mocks para Firebase

---

## ARQUIVOS PARA CORREÇÃO

| Prioridade | Arquivo | Linhas | Problema | Correção |
|------------|---------|--------|----------|----------|
| 🔴 ALTA | `AppointmentModalRefactored.tsx` | 225-236 | #001 | useRef |
| 🔴 ALTA | `AppointmentQuickView.tsx` | 307-324 | #002 | Remover onClick |
| 🔴 ALTA | `NewPatientModal.tsx` | 192-196 | #005 | Migrar Firebase |
| 🟡 MÉDIA | `CalendarAppointmentCard.tsx` | 415-427 | #003 | Remover onClick |
| 🟡 MÉDIA | `ProtocolCardEnhanced.tsx` | 92, 159 | #004 | Mover onClick |
| 🟡 MÉDIA | `SOAPFormPanel.tsx` | 112-117 | #008 | Refatorar debounce |
| 🟢 BAIXA | Vários | - | #006-009 | Otimizações |

---

## ORDENS DE CORREÇÃO

### Fase 1 - CRÍTICO (imediatamente)
1. Corrigir #001 - React Error #185 em agendamentos
2. Corrigir #002 - Dupla chamada em AppointmentQuickView
3. Corrigir #005 - Migrar NewPatientModal

### Fase 2 - MÉDIO (esta semana)
4. Corrigir #003 - Dupla chamada CalendarAppointmentCard
5. Corrigir #004 - ProtocolCardEnhanced asChild
6. Corrigir #008 - SOAPFormPanel debounce

### Fase 3 - BAIXO (quando possível)
7. Otimizar invalidation de queries
8. Ajustar cache de protocolos
9. Migrar testes para Firebase

---

## VALIDAÇÃO PÓS-CORREÇÃO

Após aplicar as correções:

1. [ ] Testar criação de agendamento (fluxo completo)
2. [ ] Testar edição de agendamento
3. [ ] Testar criação de paciente
4. [ ] Testar edição de paciente
5. [ ] Testar criação de evolução
6. [ ] Testar edição de evolução
7. [ ] Verificar console do navegador para erros React
8. [ ] Verificar se React Error #185 ainda ocorre

---

## RELATÓRIOS DETALHADOS

- [Agendamentos](.agent/fluxos/01-agendamentos.md)
- [Pacientes](.agent/fluxos/02-pacientes.md)
- [Evoluções](.agent/fluxos/03-evolucoes.md)
- [Outros CRUDs](.agent/fluxos/04-outros-cruds.md)
