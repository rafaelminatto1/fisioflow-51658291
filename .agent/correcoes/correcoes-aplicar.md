# ARQUIVO DE CORREÇÕES - FISIOFLOW

## DATA: 2025-02-01
## STATUS: PRONTO PARA IMPLEMENTAÇÃO

---

## INSTRUÇÕES

Este arquivo contém todas as correções identificadas durante a investigação. Siga a ordem de prioridade.

---

## FASE 1 - CRÍTICO (Implementar Imediatamente)

### Correção #001 - React Error #185 em AppointmentModalRefactored

**Arquivo:** `src/components/schedule/AppointmentModalRefactored.tsx`

**Linha:** 108-114, 225-236

**Problema:** `checkPatientHasPreviousSessions` no array de dependências do useEffect

**CORREÇÃO:**

```tsx
// ADICIONAR após a linha 114 (após a declaração do checkPatientHasPreviousSessions):
const checkPatientHasPreviousSessionsRef = useRef(checkPatientHasPreviousSessions);
checkPatientHasPreviousSessionsRef.current = checkPatientHasPreviousSessions;

// MODIFICAR o useEffect (linha 225-236):
useEffect(() => {
  // Só aplica lógica automática para novos agendamentos (sem appointment definido)
  if (!appointment && isOpen && watchedPatientId && currentMode === 'create') {
    const hasPreviousSessions = checkPatientHasPreviousSessionsRef.current(watchedPatientId);
    // Se paciente nunca teve sessão, muda para "avaliacao"
    if (!hasPreviousSessions) {
      setValue('status', 'avaliacao');
    } else {
      setValue('status', 'agendado');
    }
  }
  // REMOVER checkPatientHasPreviousSessions do array de dependências
}, [watchedPatientId, isOpen, appointment, currentMode, setValue]);
```

---

### Correção #002 - Dupla chamada em AppointmentQuickView

**Arquivo:** `src/components/schedule/AppointmentQuickView.tsx`

**Linha:** 307-324

**Problema:** onClick dentro do DrawerTrigger causa dupla chamada de estado

**CORREÇÃO:**

```tsx
// SUBSTITUIR o código das linhas 307-324 por:
<>
  {isMobile ? (
    // Mobile: use Drawer (Bottom Sheet)
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <span
          className="contents"
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Ver detalhes do agendamento de ${appointment.patientName}`}
        >
          {children}
        </span>
      </DrawerTrigger>
      {/* Resto do código permanece igual */}
```

**REMOVER:** O `onClick` completamente do elemento span.

---

### Correção #005 - Migrar NewPatientModal para Firebase

**Arquivo:** `src/components/modals/NewPatientModal.tsx`

**Linha:** 1-21, 191-198

**Problema:** Ainda usa Supabase para criar pacientes

**CORREÇÃO:**

```tsx
// REMOVER imports do Supabase (linha ~1-21):
// import { supabase } from '@/integrations/supabase/client';

// ADICIONAR imports do Firebase:
import { collection, addDoc, serverTimestamp, doc, setDoc } from '@/integrations/firebase/app';
import { db } from '@/integrations/firebase/app';

// SUBSTITUIR o handleSave (linha ~191-198):
const handleSave = async (data: PatientFormData) => {
  try {
    // ... validações existentes até linha 189 ...

    // Preparar dados para inserção
    const patientData = {
      name: sanitizeString(data.name, 200),
      email: cleanEmailValue || null,
      phone: cleanPhoneValue || null,
      cpf: cleanCpfValue || null,
      birth_date: format(data.birth_date, 'yyyy-MM-dd'),
      gender: data.gender,
      address: data.address ? sanitizeString(data.address, 500) : null,
      emergency_contact: data.emergency_contact ? sanitizeString(data.emergency_contact, 200) : null,
      emergency_contact_relationship: data.emergency_contact_relationship ? sanitizeString(data.emergency_contact_relationship, 100) : null,
      medical_history: data.medical_history ? sanitizeString(data.medical_history, 5000) : null,
      main_condition: sanitizeString(data.main_condition, 500),
      allergies: data.allergies ? sanitizeString(data.allergies, 500) : null,
      medications: data.medications ? sanitizeString(data.medications, 500) : null,
      weight_kg: data.weight_kg && typeof data.weight_kg === 'number' ? data.weight_kg : null,
      height_cm: data.height_cm && typeof data.height_cm === 'number' ? data.height_cm : null,
      blood_type: data.blood_type || null,
      marital_status: data.marital_status || null,
      profession: data.profession ? sanitizeString(data.profession, 200) : null,
      education_level: data.education_level || null,
      insurance_plan: data.insurance_plan ? sanitizeString(data.insurance_plan, 200) : null,
      insurance_number: data.insurance_number ? sanitizeString(data.insurance_number, 100) : null,
      status: 'Inicial',
      progress: 0,
      consent_data: true,
      consent_image: false,
      organization_id: currentOrganization.id,
      incomplete_registration: false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    // Inserir no Firebase
    const docRef = await addDoc(collection(db, 'patients'), patientData);

    logger.info('Paciente cadastrado com sucesso', {
      name: patientData.name,
      id: docRef.id
    }, 'NewPatientModal');

    toast({
      title: 'Paciente cadastrado',
      description: 'Paciente cadastrado com sucesso.',
    });

    queryClient.invalidateQueries({ queryKey: ['patients'] });
    onOpenChange(false);
    reset();
  } catch (error) {
    logger.error('Erro ao cadastrar paciente', error, 'NewPatientModal');
    toast({
      title: 'Erro',
      description: 'Não foi possível cadastrar o paciente.',
      variant: 'destructive',
    });
  }
};
```

---

## FASE 2 - MÉDIO (Implementar esta semana)

### Correção #003 - Dupla chamada CalendarAppointmentCard

**Arquivo:** `src/components/schedule/CalendarAppointmentCard.tsx`

**Linha:** 415-427

**Problema:** cardContent tem onClick que também é chamado pelo wrapper

**CORREÇÃO:**

```tsx
// REMOVER onClick do cardContent (linha ~250) ou modificar:
const handleClick = (e: React.MouseEvent) => {
  e.stopPropagation();

  if (selectionMode && onToggleSelection) {
    onToggleSelection(appointment.id);
    return;
  }

  // REMOVER esta linha para dispositivos não-touch:
  // if (isTouch) {
  //   onOpenPopover(appointment.id);
  // }
  // O AppointmentQuickView wrapper já trata isso
};

// Para touch devices, garantir que o clique funcione apenas através do AppointmentQuickView
```

---

### Correção #004 - ProtocolCardEnhanced asChild

**Arquivo:** `src/components/protocols/ProtocolCardEnhanced.tsx`

**Linha:** 92, 159

**Problema:** onClick no DropdownMenuTrigger ao invés do Button

**CORREÇÃO (linha 92):**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={(e) => e.stopPropagation()}  // MOVER PARA AQUI
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
```

**CORREÇÃO (linha 159):**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={(e) => e.stopPropagation()}  // MOVER PARA AQUI
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
```

---

### Correção #008 - SOAPFormPanel debounce

**Arquivo:** `src/components/evolution/SOAPFormPanel.tsx`

**Linha:** 112-145 (aproximadamente)

**Problema:** useEffect com debounce pode causar loops

**CORREÇÃO:**

```tsx
// ADICIONAR timer ref:
const debounceTimer = useRef<NodeJS.Timeout | null>(null);

// MODIFICAR handleChange (se já existir):
const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const newValue = e.target.value;
  setLocalValue(newValue);

  if (debounceTimer.current) {
    clearTimeout(debounceTimer.current);
  }

  debounceTimer.current = setTimeout(() => {
    if (newValue !== lastSentValue.current) {
      lastSentValue.current = newValue;
      onChange(newValue);
    }
  }, 300);
}, [onChange]);

// ADICIONAR cleanup no useEffect ou componente:
useEffect(() => {
  return () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  };
}, []);
```

---

## CHECKLIST DE VALIDAÇÃO

Após implementar as correções:

- [ ] Testar criação de agendamento no app web
- [ ] Testar edição de agendamento
- [ ] Testar visualização de detalhes do agendamento
- [ ] Testar criação de paciente
- [ ] Testar edição de paciente
- [ ] Testar criação de evolução
- [ ] Testar protocolos (dropdown menu)
- [ ] Verificar console do navegador para erros
- [ ] Verificar se "React Error #185" ainda ocorre
- [ ] Testar em dispositivos móveis (touch)

---

## NOTAS

1. **useRef import**: Verifique se `useRef` está importado de 'react' nos arquivos que precisam dele

2. **Firebase imports**: Verifique se os caminhos de import do Firebase estão corretos

3. **Testes**: Após cada correção, teste o fluxo completo para garantir que funciona

4. **Git commit**: Faça commits separados para cada correção para facilitar rollback se necessário
