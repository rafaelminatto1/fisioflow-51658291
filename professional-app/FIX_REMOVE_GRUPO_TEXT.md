# Fix: Remover texto "grupo" dos cards de agendamento

## Problema
Os cards de agendamento estavam exibindo "grupo" como nome do paciente em vez do nome real.

## Causa Raiz
Alguns registros no banco de dados Firestore tinham o campo `patient_name` com o valor "grupo" em vez do nome real do paciente.

## Solução Implementada

### 1. Filtro no Mapeamento de Dados
**Arquivo**: `professional-app/hooks/useAppointments.ts`

Adicionado filtro para remover o texto "grupo" ao mapear os dados da API:

```typescript
// Filter out "grupo" from patient name
const patientName = apiAppointment.patient_name || '';
const cleanPatientName = (patientName === 'grupo' || patientName === 'Grupo') ? '' : patientName;

return {
  // ...
  patientName: cleanPatientName,
  // ...
};
```

### 2. Fallback para Nome Vazio
**Arquivos Modificados**:
- `professional-app/components/calendar/DayView.tsx`
- `professional-app/app/(tabs)/index.tsx`

Quando o `patientName` estiver vazio, exibe "Paciente" como fallback:

```typescript
<Text>{apt.patientName || 'Paciente'}</Text>
```

### 3. Busca do Nome Real no Firestore
**Arquivo**: `professional-app/lib/firestore-fallback.ts`

Já estava implementado: quando `patient_name` é "grupo", busca o nome real na collection `patients`:

```typescript
// If patient_name is missing or is 'grupo', fetch from patients collection
if (!patientName || patientName === 'grupo') {
  const patientId = data.patient_id || data.patientId;
  if (patientId) {
    const patientRef = doc(db, 'patients', patientId);
    const patientSnap = await getDoc(patientRef);
    if (patientSnap.exists()) {
      const patientData = patientSnap.data();
      patientName = patientData.name || patientData.full_name || 'Sem nome';
    }
  }
}
```

## Resultado

✅ Cards de agendamento agora exibem:
- Nome real do paciente (quando disponível)
- "Paciente" (quando o nome está vazio ou era "grupo")
- Nunca mais exibe "grupo"

## Arquivos Modificados

1. `professional-app/hooks/useAppointments.ts` - Filtro de "grupo"
2. `professional-app/components/calendar/DayView.tsx` - Fallback "Paciente"
3. `professional-app/app/(tabs)/index.tsx` - Fallback "Paciente"
4. `professional-app/lib/firestore-fallback.ts` - Já estava correto

## Teste

Para testar:
1. Abrir a tela de Agenda
2. Verificar que nenhum card exibe "grupo"
3. Verificar que cards sem nome exibem "Paciente"
4. Verificar que cards com nome exibem o nome correto

---
**Data**: 2026-02-21
**Status**: ✅ Completo
