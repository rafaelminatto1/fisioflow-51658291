---
name: fisioflow-telemedicine
description: Reference for FisioFlow telemedicine flows using Jitsi Meet. Use when working on telemedicine routes, room lifecycle, session scheduling, meeting links, recordings, or remote session state.
---

# FisioFlow Telemedicine

Telemedicine integration using Jitsi Meet for remote physiotherapy sessions.

---

## Architecture

### Route File
`apps/api/src/routes/telemedicine.ts` (~372 lines)

### Database Table

```
telemedicine_rooms
├── id: uuid PK
├── organizationId: uuid
├── patientId → patients.id
├── therapistId: uuid
├── appointmentId → appointments.id
├── roomCode: varchar (unique, generated)
├── status: varchar default 'aguardando'
│   └── States: aguardando → em_andamento → finalizada → cancelada
├── scheduledAt: timestamp
├── startedAt: timestamp
├── endedAt: timestamp
├── durationMinutes: integer
├── recordingUrl: varchar (R2 storage URL)
├── meetingProvider: varchar (default 'jitsi')
├── meetingUrl: varchar
├── notas: text
├── createdAt: timestamp
├── updatedAt: timestamp
├── INDEX (organization_id, created_at DESC)
├── INDEX (organization_id, status)
```

Schema is lazily initialized on first request via singleton promise pattern:

```ts
let schemaInitialized = false
let schemaInitPromise: Promise<void> | null = null

async function ensureTelemedicineSchema(db: Pool) {
  if (schemaInitialized) return
  if (!schemaInitPromise) {
    schemaInitPromise = db.query(`CREATE TABLE IF NOT EXISTS telemedicine_rooms (...)`)
  }
  await schemaInitPromise
  schemaInitialized = true
}
```

---

## Meeting Provider: Jitsi Meet

URLs are built as:
```
https://meet.jit.si/fisioflow-{roomCode}
```

Room codes are unique identifiers generated on room creation.

### Jitsi Configuration
- **No server required** — Uses public Jitsi Meet infrastructure
- **Custom domain option** — For production, deploy self-hosted Jitsi on Cloudflare
- **Features:** Screen sharing, recording, chat, virtual backgrounds
- **Mobile:** Jitsi Meet SDK integrated in Expo apps

---

## Room Lifecycle

### State Machine
```
aguardando → em_andamento → finalizada
     ↓              ↓
  cancelada      cancelada
```

### Create Room
```ts
app.post("/rooms", requireAuth, async (c) => {
  const user = c.get("user")
  const body = await c.req.json()
  const roomCode = generateRoomCode() // crypto.randomUUID().slice(0, 8)
  const meetingUrl = `https://meet.jit.si/fisioflow-${roomCode}`
  
  const [room] = await db.insert(telemedicineRooms).values({
    organizationId: user.organizationId,
    patientId: body.patientId,
    therapistId: user.uid,
    appointmentId: body.appointmentId,
    roomCode,
    status: "aguardando",
    scheduledAt: body.scheduledAt,
    meetingProvider: "jitsi",
    meetingUrl,
  }).returning()
  
  return c.json({ data: normalizeRoomRow(room) }, 201)
})
```

### Start Room
```ts
app.post("/rooms/:id/start", requireAuth, async (c) => {
  await db.update(telemedicineRooms)
    .set({ status: "em_andamento", startedAt: new Date() })
    .where(and(
      eq(telemedicineRooms.id, roomId),
      eq(telemedicineRooms.organizationId, user.organizationId),
    ))
})
```

### End Room
```ts
app.post("/rooms/:id/end", requireAuth, async (c) => {
  const startedAt = room.startedAt
  const endedAt = new Date()
  const durationMinutes = Math.round((endedAt - startedAt) / 60000)
  
  await db.update(telemedicineRooms)
    .set({ status: "finalizada", endedAt, durationMinutes, recordingUrl })
    .where(...)
})
```

### List Rooms
```ts
app.get("/rooms", requireAuth, async (c) => {
  const rooms = await db.query(`
    SELECT r.*, p.name as patient_name, p.email as patient_email, p.phone as patient_phone
    FROM telemedicine_rooms r
    LEFT JOIN patients p ON p.id = r.patient_id
    WHERE r.organization_id = $1
    ORDER BY r.created_at DESC
  `, [user.organizationId])
  
  return c.json({ data: rooms.map(normalizeRoomRow) })
})
```

---

## Appointment Integration

When creating a telemedicine appointment:
1. Create `appointment` with `type: "session"` (or new type `telemedicine`)
2. Create `telemedicine_room` linked to the appointment
3. Send WhatsApp message with meeting link to patient
4. On appointment status change → update room status accordingly

```ts
// On appointment confirmation
c.executionCtx.waitUntil(
  c.env.WHATSAPP_QUEUE.send({
    type: "send_template",
    to: patient.phone,
    template: "confirmacao_agendamento",
    variables: {
      name: patient.fullName,
      therapist: therapist.name,
      date: formatDate(appointment.date),
      time: appointment.startTime,
    },
    extra: { meetingUrl: room.meetingUrl },
  })
)
```

---

## Recording Integration

- Recordings stored in Cloudflare R2
- `recordingUrl` points to R2 public URL
- Access controlled via signed URLs for LGPD compliance
- Recording start/stop managed via Jitsi API or custom backend

### R2 Storage Path
```
telemedicine-recordings/{organizationId}/{roomId}/{timestamp}.mp4
```

---

## Frontend Integration

### Therapist View (Web)
- Room management in appointment detail
- "Start Video Call" button when appointment time arrives
- Embedded Jitsi iframe or external link
- Duration timer

### Patient View (Mobile/Web)
- Deep link from WhatsApp notification
- In-app Jitsi Meet via SDK (mobile)
- Embedded iframe (web portal)
- Pre-call checklist (camera, mic permissions)

---

## Future Enhancements

- **AI Transcription:** Workers AI speech-to-text for session notes
- **Auto-SOAP Generation:** Transcribe call → generate SOAP sections
- **Screen Share Annotation:** Therapist annotates patient exercises in real-time
- **Multi-participant:** Group telemedicine sessions (already supported by appointment `isGroup`)
