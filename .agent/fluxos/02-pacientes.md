# RELATÓRIO: FLUXO DE PACIENTES

## DATA: 2025-02-01

## ARQUIVOS ANALISADOS

### App Web (Principal)
| Arquivo | Caminho | Status |
|---------|---------|--------|
| Página Perfil | `src/pages/patients/PatientProfilePage.tsx` | ⚠️ PROBLEMAS |
| Modal Novo | `src/components/modals/NewPatientModal.tsx` | ⚠️ MIGRAÇÃO PENDENTE |
| Modal Edição | `src/components/modals/EditPatientModal.tsx` | ⏳ Análise pendente |
| Combobox | `src/components/ui/patient-combobox.tsx` | ✅ Analisado |
| Dashboard 360 | `src/components/patient/dashboard/PatientDashboard360.tsx` | ⏳ Análise pendente |

### App iOS (Secondary)
| Arquivo | Caminho | Status |
|---------|---------|--------|
| Lista | `apps/professional-ios/app/(tabs)/patients.tsx` | ⏳ Análise pendente |
| Novo | `apps/professional-ios/app/(drawer)/patients/new.tsx` | ⏳ Análise pendente |
| Detalhes | `apps/professional-ios/app/(drawer)/patients/[id].tsx` | ⏳ Análise pendente |

---

## PROBLEMAS IDENTIFICADOS

### 🔴 CRÍTICO #005: MIGRAÇÃO INCOMPLETA - Supabase ainda em uso

**Localização:** `src/components/modals/NewPatientModal.tsx:192-196`

```tsx
// Insert direto no Supabase com organization_id
const { error } = await supabase
  .from('patients')
  .insert([patientData])
  .select()
  .single();
```

**Problema:** O modal de criação de paciente ainda usa Supabase diretamente, mas deveria usar Firebase como o resto do sistema.

**Impacto:** CRÍTICO - O fluxo de criação de paciente pode não funcionar se o Supabase foi desativado.

**Correção Necessária:** Migrar para Firebase Firestore usando o padrão:
```tsx
import { collection, addDoc, serverTimestamp } from '@/integrations/firebase/app';

const docRef = await addDoc(collection(db, 'patients'), {
  ...patientData,
  created_at: serverTimestamp(),
  updated_at: serverTimestamp(),
});
```

---

### 🟡 MÉDIO #006: PopoverTrigger no PatientCombobox

**Localização:** `src/components/ui/patient-combobox.tsx:114-118`

```tsx
<PopoverTrigger asChild>
  <Button
    variant="outline"
    role="combobox"
    aria-expanded={open}
    ...
  >
```

**Análise:** Este código parece correto, não tem onClick duplicado. O botão funciona como trigger.

**Status:** ✅ SEM PROBLEMAS

---

### 🟢 BAIXO #007: Validação de CPF em useEffect

**Localização:** Vários componentes de paciente

**Observação:** A formatação de CPF e telefone é feita via handlers de onChange, não via useEffect, o que é correto.

**Status:** ✅ BOM PADRÃO

---

## FLUXOS TESTADOS

| Fluxo | Status | Observações |
|-------|--------|-------------|
| Criar paciente | ⚠️ Migração pendente | Usa Supabase, precisa migrar |
| Editar paciente | ⏳ Pendente | A testar |
| Visualizar paciente | ⏳ Pendente | A testar |
| Buscar pacientes | ✅ Combobox OK | Fuzzy search funcionando |
| Deletar paciente | ⏳ Pendente | A testar |

---

## CORREÇÕES RECOMENDADAS

### #005 - Migrar NewPatientModal para Firebase

1. Substituir import do Supabase:
```tsx
// REMOVER:
import { supabase } from '@/integrations/supabase/client';

// ADICIONAR:
import { collection, addDoc, serverTimestamp } from '@/integrations/firebase/app';
```

2. Atualizar handleSave:
```tsx
const handleSave = async (data: PatientFormData) => {
  try {
    // ... validações existentes ...

    // Preparar dados para inserção
    const patientData = {
      ...patientData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      // ... outros campos
    };

    // Inserir no Firebase
    const docRef = await addDoc(collection(db, 'patients'), patientData);

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

## VALIDAÇÕES ENCONTRADAS

### Schema de Validação (patientSchema)
```tsx
- name: 2-200 caracteres ✅
- email: opcional, validado ✅
- phone: opcional, validado ✅
- cpf: opcional, validado ✅
- birth_date: obrigatório ✅
- gender: enum (masculino, feminino, outro) ✅
- address: até 500 caracteres ✅
- emergency_contact: até 200 caracteres ✅
- medical_history: até 5000 caracteres ✅
- main_condition: obrigatório, 1-500 caracteres ✅
- allergies: até 500 caracteres ✅
- medications: até 500 caracteres ✅
- weight_kg: positivo, até 500kg ✅
- height_cm: positivo, até 300cm ✅
- blood_type: opcional ✅
- marital_status: opcional ✅
- profession: até 200 caracteres ✅
- education_level: opcional ✅
- insurance_plan: até 200 caracteres ✅
- insurance_number: até 100 caracteres ✅
```

### Sanitização
- `sanitizeString()` - Limpeza de strings ✅
- `sanitizeEmail()` - Limpeza de email ✅
- `cleanCPF()` - Remove formatação ✅
- `cleanPhone()` - Remove formatação ✅

---

## PRÓXIMOS PASSOS

1. [ ] Migrar NewPatientModal para Firebase
2. [ ] Verificar EditPatientModal
3. [ ] Testar criação de paciente
4. [ ] Testar edição de paciente
5. [ ] Testar visualização de perfil
6. [ ] Verificar se há problemas de asChild + onClick em componentes de paciente
