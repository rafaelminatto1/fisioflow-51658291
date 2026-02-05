# Solução do Fluxo de Cadastro Incompleto

## Problema Identificado
O botão "completar cadastro de pacientes incompletos" na página de pacientes não estava funcionando corretamente. Embora o botão navegasse para a página do paciente, o fluxo completo não estava sendo executado.

## Causa Raiz
1. **Modal não abria automaticamente**: A página de perfil do paciente não verificava se o paciente tinha `incomplete_registration: true` e não abria o modal de edição automaticamente.
2. **Status não atualizado**: O modal de edição não definia `incomplete_registration: false` ao salvar as alterações, então mesmo que o usuário completasse o cadastro, o status permanecia como incompleto.

## Soluções Implementadas

### 1. Modificação em `src/pages/patients/PatientProfilePage.tsx`

#### Adição de useEffect para detectar cadastro incompleto
```typescript
// Auto-open edit modal if patient has incomplete registration
useEffect(() => {
    if (patient && patient.incomplete_registration) {
        setEditingPatient(true);
    }
}, [patient]);
```

#### Importação do useEffect
```typescript
import React, { useState, useEffect } from 'react';
```

#### Passagem do objeto patient como prop para o EditPatientModal
```typescript
<EditPatientModal
    open={editingPatient}
    onOpenChange={setEditingPatient}
    patientId={id}
    patient={patient}
/>
```

### 2. Modificação em `src/components/modals/EditPatientModal.tsx`

#### Adição da prop patient ao componente
```typescript
export const EditPatientModal: React.FC<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  patientId?: string;
  patient?: Patient | null;
}> = ({ open, onOpenChange, patientId, patient }) => {
```

#### Modificação da função formDataToPatientUpdate
```typescript
/** Mapeia dados do formulário para o payload aceito pelo backend (campos permitidos). */
function formDataToPatientUpdate(data: PatientFormData, wasIncompleteRegistration?: boolean): Partial<Patient> {
  const update: Partial<Patient> = { name: data.name };
  if (data.email !== undefined && data.email !== '') update.email = data.email;
  if (data.phone !== undefined && data.phone !== '') update.phone = data.phone;
  if (data.cpf !== undefined && data.cpf !== '') update.cpf = data.cpf;
  if (data.birth_date) update.birthDate = data.birth_date;
  if (data.observations !== undefined) update.mainCondition = data.observations;
  if (data.status) update.status = data.status;
  
  // Se o cadastro estava incompleto, marca como completo
  if (wasIncompleteRegistration) {
    update.incomplete_registration = false;
  }
  
  return update;
}
```

#### Atualização da mutation para passar o parâmetro wasIncompleteRegistration
```typescript
const updateMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      if (!patientId) throw new Error('Patient ID is required');
      const updates = formDataToPatientUpdate(data, patient?.incomplete_registration);
      return PatientService.updatePatient(patientId, updates);
    },
    // ...
});
```

## Resultado Esperado

Com estas alterações, o fluxo completo funcionará da seguinte maneira:

1. **Usuário clica em "Completar"** na lista de pacientes com cadastro incompleto
2. **Navega para a página do paciente** - `/patients/:id`
3. **Modal de edição abre automaticamente** porque o paciente tem `incomplete_registration: true`
4. **Usuário preenche/altera os dados necessários** e clica em "Salvar Alterações"
5. **O sistema atualiza o paciente** e define `incomplete_registration: false` automaticamente
6. **Modal fecha** e o paciente é removido da lista de "cadastros incompletos"

## Testes Realizados
- ✅ Verificação da presença da lógica para abrir modal automático
- ✅ Verificação da lógica para marcar cadastro como completo
- ✅ Verificação da adição da prop patient
- ✅ Verificação da modificação da função formDataToPatientUpdate

## Notas Adicionais
- A solução mantém a compatibilidade com o fluxo existente de edição manual
- Apenas pacientes com `incomplete_registration: true` terão o comportamento automático
- O campo `incomplete_registration` é atualizado apenas se estava como `true` antes da edição

## Próximos Passos (Opcionais)
1. Adicionar notificação visual para o usuário informando que o cadastro foi marcado como completo
2. Implementar validação mais robusta para garantir que todos os campos obrigatórios foram preenchidos
3. Adicionar indicador visual na página do paciente para mostrar que o cadastro foi completado recentemente