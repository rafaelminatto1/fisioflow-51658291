# FisioFlow - API Documentation

**Versão:** 2.0.0
**Última atualização:** 2026-02-18

---

## 📚 Visão Geral

Esta documentação detalha todas as APIs disponíveis no FisioFlow, incluindo endpoints REST, Cloud Functions e integrações.

---

## 🔐 Autenticação

Todas as requisições requerem autenticação via Firebase Auth JWT token.

### Headers Obrigatórios

```http
Authorization: Bearer <firebase-jwt-token>
Content-Type: application/json
```

### Obter Token

```typescript
import { auth } from '@/lib/firebase';

const token = await auth.currentUser?.getIdToken();
```

---

## 👥 Patients API

### GET /patients

Retorna lista de pacientes ativos da organização.

**Query Parameters:**
- `organization_id` (required): ID da organização
- `limit` (optional): Número máximo de resultados (default: 100)
- `offset` (optional): Paginação (default: 0)
- `search` (optional): Busca por nome, email ou CPF
- `status` (optional): Filtrar por status (active, inactive)

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@example.com",
      "phone": "11999999999",
      "cpf": "12345678900",
      "birth_date": "1990-01-01",
      "gender": "male",
      "status": "active",
      "organization_id": "org-uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "limit": 100,
  "offset": 0
}
```

**Exemplo:**

```typescript
import { PatientService } from '@/services/patientService';

const { data, error } = await PatientService.getActivePatients('org-id');
```

---

### GET /patients/:id

Retorna detalhes de um paciente específico.

**Path Parameters:**
- `id` (required): ID do paciente

**Response:**

```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11999999999",
  "cpf": "12345678900",
  "birth_date": "1990-01-01",
  "gender": "male",
  "address": "Rua Teste, 123",
  "city": "São Paulo",
  "state": "SP",
  "zip_code": "01234-567",
  "status": "active",
  "organization_id": "org-uuid",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### POST /patients

Cria um novo paciente.

**Request Body:**

```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11999999999",
  "cpf": "12345678900",
  "birth_date": "1990-01-01",
  "gender": "male",
  "address": "Rua Teste, 123",
  "city": "São Paulo",
  "state": "SP",
  "zip_code": "01234-567",
  "organization_id": "org-uuid"
}
```

**Response:**

```json
{
  "id": "new-uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "status": "active",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### PUT /patients/:id

Atualiza um paciente existente.

**Path Parameters:**
- `id` (required): ID do paciente

**Request Body:**

```json
{
  "name": "João Silva Santos",
  "phone": "11988888888",
  "address": "Rua Nova, 456"
}
```

**Response:**

```json
{
  "id": "uuid",
  "name": "João Silva Santos",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### DELETE /patients/:id

Desativa um paciente (soft delete).

**Path Parameters:**
- `id` (required): ID do paciente

**Response:**

```json
{
  "success": true,
  "message": "Paciente desativado com sucesso"
}
```

---

## 📅 Appointments API

### GET /appointments

Retorna lista de agendamentos.

**Query Parameters:**
- `organization_id` (required): ID da organização
- `start_date` (optional): Data inicial (ISO 8601)
- `end_date` (optional): Data final (ISO 8601)
- `patient_id` (optional): Filtrar por paciente
- `therapist_id` (optional): Filtrar por terapeuta
- `status` (optional): Filtrar por status

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "patient_id": "patient-uuid",
      "therapist_id": "therapist-uuid",
      "start_time": "2024-01-01T10:00:00Z",
      "end_time": "2024-01-01T11:00:00Z",
      "status": "scheduled",
      "type": "consultation",
      "notes": "Primeira consulta",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 50
}
```

---

### POST /appointments

Cria um novo agendamento.

**Request Body:**

```json
{
  "patient_id": "patient-uuid",
  "therapist_id": "therapist-uuid",
  "start_time": "2024-01-01T10:00:00Z",
  "end_time": "2024-01-01T11:00:00Z",
  "type": "consultation",
  "notes": "Primeira consulta",
  "organization_id": "org-uuid"
}
```

**Response:**

```json
{
  "id": "new-uuid",
  "patient_id": "patient-uuid",
  "start_time": "2024-01-01T10:00:00Z",
  "status": "scheduled",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## 📝 SOAP Notes API

### GET /soap-notes

Retorna notas SOAP de um paciente.

**Query Parameters:**
- `patient_id` (required): ID do paciente
- `limit` (optional): Número máximo de resultados
- `offset` (optional): Paginação

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "patient_id": "patient-uuid",
      "therapist_id": "therapist-uuid",
      "appointment_id": "appointment-uuid",
      "subjective": "Paciente relata dor no joelho",
      "objective": "Edema presente, ROM limitado",
      "assessment": "Tendinite patelar",
      "plan": "Crioterapia e exercícios de fortalecimento",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /soap-notes

Cria uma nova nota SOAP.

**Request Body:**

```json
{
  "patient_id": "patient-uuid",
  "appointment_id": "appointment-uuid",
  "subjective": "Paciente relata dor no joelho",
  "objective": "Edema presente, ROM limitado",
  "assessment": "Tendinite patelar",
  "plan": "Crioterapia e exercícios de fortalecimento"
}
```

---

## 💪 Exercises API

### GET /exercises

Retorna biblioteca de exercícios.

**Query Parameters:**
- `organization_id` (required): ID da organização
- `category` (optional): Filtrar por categoria
- `difficulty` (optional): Filtrar por dificuldade
- `search` (optional): Busca por nome ou descrição

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Agachamento",
      "description": "Exercício de fortalecimento",
      "category": "strength",
      "difficulty": "intermediate",
      "duration": 30,
      "repetitions": 10,
      "sets": 3,
      "video_url": "https://example.com/video.mp4",
      "thumbnail_url": "https://example.com/thumb.jpg"
    }
  ]
}
```

---

## 💰 Financial API

### GET /transactions

Retorna transações financeiras.

**Query Parameters:**
- `organization_id` (required): ID da organização
- `start_date` (optional): Data inicial
- `end_date` (optional): Data final
- `type` (optional): income ou expense
- `category` (optional): Categoria

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "description": "Consulta",
      "amount": 150.00,
      "type": "income",
      "category": "consultation",
      "date": "2024-01-01",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total_income": 5000.00,
  "total_expense": 2000.00,
  "balance": 3000.00
}
```

---

## 🔔 Notifications API

### POST /notifications/send

Envia uma notificação.

**Request Body:**

```json
{
  "user_id": "user-uuid",
  "title": "Lembrete de Consulta",
  "body": "Você tem uma consulta amanhã às 10h",
  "type": "appointment_reminder",
  "channels": ["push", "email"],
  "data": {
    "appointment_id": "appointment-uuid"
  }
}
```

---

## 📊 Analytics API

### GET /analytics/dashboard

Retorna métricas do dashboard.

**Query Parameters:**
- `organization_id` (required): ID da organização
- `start_date` (optional): Data inicial
- `end_date` (optional): Data final

**Response:**

```json
{
  "total_patients": 100,
  "active_patients": 85,
  "total_appointments": 500,
  "completed_appointments": 450,
  "revenue": 50000.00,
  "adherence_rate": 85.5
}
```

---

## 🚨 Error Responses

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "details": {
    "field": "email",
    "issue": "Invalid email format"
  }
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "request_id": "uuid"
}
```

---

## 📝 Rate Limiting

- **Default:** 100 requests/minute
- **Heavy operations:** 10 requests/minute
- **Auth operations:** 5 requests/minute

**Headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## 🔗 Webhooks

### Appointment Created

```json
{
  "event": "appointment.created",
  "data": {
    "id": "uuid",
    "patient_id": "patient-uuid",
    "start_time": "2024-01-01T10:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Patient Updated

```json
{
  "event": "patient.updated",
  "data": {
    "id": "uuid",
    "changes": {
      "phone": "11988888888"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

**Última atualização:** 2026-02-18
