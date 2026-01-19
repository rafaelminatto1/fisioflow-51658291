# 📚 Referência da API e Eventos

## Eventos do Inngest (Automação)

O sistema utiliza o Inngest para orquestrar workflows em segundo plano. Abaixo estão os eventos disponíveis.

### 📅 Agendamentos

#### `whatsapp/appointment.confirmation`
Disparado quando um agendamento é criado.
```typescript
{
  name: "whatsapp/appointment.confirmation",
  data: {
    to: string;           // Telefone (5511999999999)
    patientName: string;
    therapistName: string;
    date: string;         // DD/MM/AAAA
    time: string;         // HH:MM
    organizationName: string;
    cancelLink?: string;  // Opcional
  }
}
```

#### `whatsapp/appointment.reminder`
Disparado 24h antes da consulta via Cron/Workflow.
```typescript
{
  name: "whatsapp/appointment.reminder",
  data: {
    to: string;
    patientName: string;
    therapistName: string;
    date: string;
    time: string;
  }
}
```

### ♻️ Engajamento

#### `whatsapp/reactivation`
Disparado semanalmente para pacientes inativos.
```typescript
{
  name: "whatsapp/reactivation",
  data: {
    to: string;
    patientName: string;
    organizationName: string;
  }
}
```

#### `email/reactivation`
Versão de email do evento de reativação.
```typescript
{
  name: "email/reactivation",
  data: {
    to: string;           // Email
    patientName: string;
    organizationName: string;
  }
}
```

---

## Edge Functions

As Edge Functions rodam no Supabase Edge Runtime para lógica segura e de alta performance.

### `public-booking`
Cria reservas públicas sem expor permissões de escrita direta no banco.

- **URL:** `/functions/v1/public-booking`
- **Método:** `POST`
- **Body:**
  ```json
  {
    "slug": "dr-rafael",
    "name": "Nome Paciente",
    "phone": "5511999999999",
    "email": "email@teste.com",
    "date": "2026-01-20",
    "slotTime": "10:00",
    "notes": "Opcional"
  }
  ```
- **Resposta:**
  - `200 OK`: `{ success: true, appointmentId: "..." }`
  - `400 Bad Request`: Erro de validação.

### `google-calendar-sync`
Gerencia a sincronização bidirecional com Google Calendar.

- **URL:** `/functions/v1/google-calendar-sync`
- **Métodos:**
  - `POST`: Inicia sincronização manual ou processa webhook.
  - `GET`: Verifica status da conexão.
- **Headers:** Requer `Authorization: Bearer <token>` (apenas usuários autenticados).

---

## WhatsApp Templates (Cloud API)

Para iniciar conversas (fora da janela de 24h), utilize estes templates aprovados:

| Nome do Template | Categoria | Idioma | Variáveis |
|------------------|-----------|--------|-----------|
| `appointment_confirmation` | UTILITY | pt_BR | {{1}}=Nome, {{2}}=Data, {{3}}=Hora |
| `appointment_reminder` | UTILITY | pt_BR | {{1}}=Nome, {{2}}=Data, {{3}}=Hora |
| `reactivation_msg` | MARKETING | pt_BR | {{1}}=Nome |
| `birthday_greeting` | MARKETING | pt_BR | {{1}}=Nome |

> **Nota:** Se a janela de 24h estiver aberta (usuário mandou mensagem recentemente), o sistema pode enviar mensagens de texto livre via fallback.
