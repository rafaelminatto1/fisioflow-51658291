# RELATÓRIO: FLUXO DE AGENDAMENTOS

## DATA: 2025-02-01

## ARQUIVOS ANALISADOS

### App Web (Principal)
| Arquivo | Caminho | Status |
|---------|---------|--------|
| Página Principal | `src/pages/Schedule.tsx` | ✅ Analisado |
| Modal de Agendamento | `src/components/schedule/AppointmentModalRefactored.tsx` | ⚠️ PROBLEMAS |
| Segmentos do Modal | `src/components/schedule/AppointmentDialogSegments.tsx` | ⚠️ PROBLEMAS |
| QuickView | `src/components/schedule/AppointmentQuickView.tsx` | ⚠️ PROBLEMAS |
| Card de Agendamento | `src/components/schedule/CalendarAppointmentCard.tsx` | ✅ Analisado |
| Hook | `src/hooks/useAppointments.ts` | ✅ Analisado |

### App iOS (Secondary)
| Arquivo | Caminho | Status |
|---------|---------|--------|
| Novo Agendamento | `apps/professional-ios/app/(drawer)/agenda/new.tsx` | ✅ Sem problemas |
| Hook | `apps/professional-ios/hooks/useAppointments.ts` | ✅ Sem problemas |

---

## PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICO #001: React Error #185 - Maximum update depth exceeded

**Localização:** `src/components/schedule/AppointmentModalRefactored.tsx`

**Causa Raiz:** Múltiplos useEffects com dependências instáveis que causam loops de renderização

#### Problema 1: useEffect com dependência instável (linha 225-236)

```tsx
// Monitora mudanças no paciente selecionado para ajustar o status automaticamente
useEffect(() => {
  if (!appointment && isOpen && watchedPatientId && currentMode === 'create') {
    const hasPreviousSessions = checkPatientHasPreviousSessions(watchedPatientId);
    if (!hasPreviousSessions) {
      setValue('status', 'avaliacao');
    } else {
      setValue('status', 'agendado');
    }
  }
}, [watchedPatientId, isOpen, appointment, currentMode, setValue, checkPatientHasPreviousSessions]);
```

**Problema:** `checkPatientHasPreviousSessions` é um `useCallback` que depende de `appointments`, que pode mudar frequentemente quando os dados são atualizados.

#### Problema 2: useEffect de reset (linha 200-222)

```tsx
useEffect(() => {
  if (!isOpen) return;
  try {
    const formData = getInitialFormData(appointment, {
      date: defaultDate,
      time: defaultTime,
      patientId: defaultPatientId
    });
    reset(formData);
    setCurrentMode(appointment ? 'edit' : initialMode);
    setActiveTab('info');
  } catch (err) {
    // ...
  }
}, [appointment, isOpen, defaultDate, defaultTime, defaultPatientId, initialMode, reset, getInitialFormData]);
```

**Problema:** Muitas dependências podem causar re-execução desnecessária.

---

### 🟡 MÉDIO #002: asChild + onClick Duplo

**Localização:** `src/components/schedule/AppointmentQuickView.tsx:307-324`

```tsx
<Drawer open={open} onOpenChange={onOpenChange}>
  <DrawerTrigger asChild>
    <span
      className="contents"
      onClick={(e) => {
        e.stopPropagation();
        onOpenChange?.(true);  // ← PROBLEMA: Chamada dupla!
      }}
    >
      {children}
    </span>
  </DrawerTrigger>
```

**Problema:** O `onClick` dentro do `DrawerTrigger asChild` chama `onOpenChange`, mas o `DrawerTrigger` já dispara `onOpenChange` automaticamente. Isso pode causar duas atualizações de estado.

**Impacto:** Pode causar o erro #185 em certas condições.

---

### 🟡 MÉDIO #003: Dupla chamada de onOpenPopover

**Localização:** `src/components/schedule/CalendarAppointmentCard.tsx:415-427`

```tsx
<AppointmentQuickView
  appointment={appointment}
  open={isPopoverOpen}
  onOpenChange={(open) => {
    if (isDragging && open) return;
    onOpenPopover(open ? appointment.id : null);  // ← Chamada 1
  }}
>
  {cardContent}  // ← cardContent tem onClick que chama onOpenPopover (Chamada 2)
</AppointmentQuickView>
```

**Problema:** O `cardContent` tem `onClick={handleClick}` que também chama `onOpenPopover(appointment.id)`.

**Impacto:** Pode causar atualizações de estado duplicadas.

---

### 🟢 BAIXO #004: Padrão asChild + onClick em outros componentes

**Localização:** `src/components/protocols/ProtocolCardEnhanced.tsx:92, :159`

```tsx
<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
```

**Problema:** O `onClick` deveria estar no componente filho (Button), não no `Trigger`.

**Impacto:** Baixo - não causa erro #185 diretamente, mas é um padrão incorreto.

---

## CORREÇÕES RECOMENDADAS

### #001 - Fixar useEffect com dependências instáveis

```tsx
// Usar useRef para armazenar a referência da função
const checkPatientHasPreviousSessionsRef = useRef(checkPatientHasPreviousSessions);
checkPatientHasPreviousSessionsRef.current = checkPatientHasPreviousSessions;

useEffect(() => {
  if (!appointment && isOpen && watchedPatientId && currentMode === 'create') {
    const hasPreviousSessions = checkPatientHasPreviousSessionsRef.current(watchedPatientId);
    if (!hasPreviousSessions) {
      setValue('status', 'avaliacao');
    } else {
      setValue('status', 'agendado');
    }
  }
}, [watchedPatientId, isOpen, appointment, currentMode, setValue]); // Sem checkPatientHasPreviousSessions
```

### #002 - Remover onClick duplicado

```tsx
<Drawer open={open} onOpenChange={onOpenChange}>
  <DrawerTrigger asChild>
    <span className="contents" role="button" tabIndex={0}>
      {children}
    </span>
  </DrawerTrigger>
```

### #003 - Centralizar chamada de onOpenPopover

Remover `onClick` do `cardContent` e deixar apenas o `AppointmentQuickView` controlar o estado.

---

## FLUXOS TESTADOS

| Fluxo | Status | Observações |
|-------|--------|-------------|
| Criar agendamento | ⚠️ Erro #185 | Em produção |
| Editar agendamento | ⏳ Pendente | A testar |
| Visualizar agendamento | ⏳ Pendente | A testar |
| Cancelar agendamento | ⏳ Pendente | A testar |
| Arrastar e soltar | ⏳ Pendente | A testar |

---

## PRÓXIMOS PASSOS

1. [ ] Implementar correção #001
2. [ ] Implementar correção #002
3. [ ] Implementar correção #003
4. [ ] Testar fluxo de criação novamente
5. [ ] Testar fluxo de edição
6. [ ] Testar visualização
7. [ ] Testar cancelamento
8. [ ] Testar drag & drop
