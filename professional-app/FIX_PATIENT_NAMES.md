# Correção: Nomes dos Pacientes na Agenda

## Problema

Todos os agendamentos estavam mostrando "grupo" ao invés do nome do paciente na tela de agenda.

## Causa

O campo `patient_name` não estava sendo retornado corretamente do Firestore. Isso acontece porque:

1. Os documentos de `appointments` no Firestore podem não ter o campo `patient_name` populado
2. Ou o campo pode estar com valor incorreto ("grupo")
3. O Firestore fallback estava apenas copiando o valor sem validar

## Solução

Modificado `listAppointmentsFirestore()` em `lib/firestore-fallback.ts` para:

1. **Verificar se `patient_name` existe e é válido**
   - Se estiver faltando ou for "grupo", busca o nome do paciente

2. **Buscar nome do paciente da coleção `patients`**
   - Usa o `patient_id` do agendamento
   - Faz query na coleção `patients`
   - Retorna `name` ou `full_name` do paciente

3. **Fallback para "Sem nome"**
   - Se não conseguir buscar o paciente, usa "Sem nome"

## Código Implementado

```typescript
// Para cada agendamento
let patientName = data.patient_name || data.patientName;

// Se patient_name está faltando ou é 'grupo'
if (!patientName || patientName === 'grupo') {
  const patientId = data.patient_id || data.patientId;
  if (patientId) {
    // Busca o paciente no Firestore
    const patientRef = firestoreDoc(db, 'patients', patientId);
    const patientSnap = await getDoc(patientRef);
    if (patientSnap.exists()) {
      const patientData = patientSnap.data();
      patientName = patientData.name || patientData.full_name || 'Sem nome';
    }
  }
}
```

## Como Testar

1. **Reinicie o Expo:**
   ```bash
   # Pare o servidor (Ctrl+C)
   cd professional-app
   npx expo start --clear
   ```

2. **Abra o app no dispositivo**

3. **Vá para a aba Agenda**

4. **Verifique:**
   - ✅ Os agendamentos devem mostrar o nome real do paciente
   - ✅ Não deve mais aparecer "grupo"
   - ✅ Se não conseguir buscar o nome, mostra "Sem nome"

## Logs Esperados

```
LOG  [API] Using Firestore fallback for getAppointments
LOG  AgendaScreen: Display appointments count: 32
```

Se houver problemas ao buscar nomes:
```
WARN  [Firestore] Could not fetch patient name for: <patient-id>
```

## Performance

**Nota:** Esta solução faz uma query adicional para cada agendamento que não tem `patient_name`. 

Para melhorar performance em produção:
1. Popule o campo `patient_name` nos documentos de `appointments` no Firestore
2. Ou use Cloud Functions que já fazem JOIN no PostgreSQL

## Alternativa (Futuro)

Quando os Cloud Functions estiverem deployados:
1. Ative `useCloudFunctions: true` em `lib/config.ts`
2. Os Cloud Functions já retornam `patient_name` do PostgreSQL com JOIN
3. Não será necessário buscar o nome separadamente

## Arquivo Modificado

- `professional-app/lib/firestore-fallback.ts` - Função `listAppointmentsFirestore()`
