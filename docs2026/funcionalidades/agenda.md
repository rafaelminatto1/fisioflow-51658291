# Funcionalidade: Agenda de Agendamentos

## Visão Geral

Sistema de agendamento avançado com visualização diária, semanal e mensal, detecção de conflitos e notificações automáticas.

## Recursos Principais

### Visualização

- 📅 Vista diária
- 📅 Vista semanal
- 📅 Vista mensal
- 🎨 Calendário colorido por status

### Funcionalidades

- ✅ Detecção automática de conflitos
- ✅ Agendamentos recorrentes
- ✅ Múltiplas salas de atendimento
- ✅ Notificações automáticas
- ✅ Lembretes via email/push
- ✅ Sync com Google Calendar (planejado)
- ✅ Gestão de horários de atendimento

## Tipos de Agendamento

- `initial` - Avaliação inicial
- `follow_up` - Retorno
- `evaluation` - Avaliação
- `therapy` - Terapia
- `telemedicine` - Telemedicina

## Status

- `scheduled` - Agendado
- `confirmed` - Confirmado
- `in_progress` - Em andamento
- `completed` - Concluído
- `cancelled` - Cancelado
- `no_show` - Não compareceu

## Páginas

- `/schedule` - Agenda principal

## Componentes

- `AppointmentCalendar` - Calendário principal
- `AppointmentForm` - Formulário de agendamento
- `AppointmentCard` - Card de agendamento
- `ConflictDetector` - Detector de conflitos

## API (Firestore)

```typescript
// GET appointments
const snapshot = await getDocs(
  query(
    collection(db, 'appointments'),
    where('organization_id', '==', orgId),
    where('start_time', '>=', start),
    where('start_time', '<=', end)
  )
);

// POST appointment
const ref = await addDoc(collection(db, 'appointments'), appointment);

// PATCH appointment
await updateDoc(doc(db, 'appointments', id), changes);
```

## Veja Também

- [Pacientes](./pacientes.md) - Gestão de pacientes
- [Notificações](./telemedicina.md) - Lembretes automáticos
