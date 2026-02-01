# 📱 Configuração de Notificações - FisioFlow

## ✅ WhatsApp Business API - Configurado

### Secrets Configuradas
| Secret | Status | Valor |
|--------|--------|-------|
| `WHATSAPP_PHONE_NUMBER_ID` | ✅ Ativo | `779431901927431` |
| `WHATSAPP_ACCESS_TOKEN` | ✅ Ativo | `EAAjPUGyZBQPoBPuHi3n...` |

### Templates Disponíveis
| Template | Status | Uso |
|----------|--------|-----|
| `appointment_confirmation` | ✅ | Confirmação de agendamento |
| `appointment_reminder` | ✅ | Lembrete de agendamento |
| `appointment_reminder_24h` | ✅ | Lembrete 24h antes |
| `welcome_message` | ✅ | Mensagem de boas-vindas |
| `appointment_cancelled` | ✅ | Cancelamento |
| `precadastro_confirmation` | ✅ | Confirmação pré-cadastro |
| `birthday_greeting` | ✅ | Felicitação de aniversário |
| `patient_reactivation` | ✅ | Reativação de paciente |
| `payment_confirmation` | ✅ | Confirmação de pagamento |
| `exercise_assigned` | ✅ | Exercício atribuído |

### Funções WhatsApp Disponíveis
| Função | Tipo | Descrição |
|--------|------|-----------|
| `sendWhatsApp` | Callable | Envia mensagem template |
| `testWhatsAppMessage` | Callable | Teste de envio |
| `testWhatsAppTemplate` | Callable | Teste de template |
| `getWhatsAppHistory` | Callable | Histórico de mensagens |
| `whatsappWebhook` | HTTP | Webhook para receber mensagens |

---

## 📧 Email - Configuração

### Status
Verificar arquivo: `functions/src/communications/email.ts`

### Funções Email Disponíveis
| Função | Descrição |
|--------|-----------|
| `sendEmail` | Envia email transacional |
| `sendAppointmentReminder` | Lembrete de agendamento |
| `sendBirthdayEmail` | Email de aniversário |
| `sendWeeklyReport` | Relatório semanal |

---

## 🧪 COMO TESTAR NOTIFICAÇÕES

### Opção 1: Teste via Firebase Console
1. Acesse: https://console.firebase.google.com/project/fisioflow-migration/functions
2. Selecione `testWhatsAppMessage`
3. Clique em "Testar a função"
4. Use este JSON:
```json
{
  "secret": "FISIOFLOW_TEST_SECRET",
  "phone": "+5511987654321",
  "name": "Teste",
  "template": "welcome_message"
}
```

### Opção 2: Teste via Frontend
1. Faça login no sistema
2. Acesse: Administração → Configurações → Notificações
3. Clique em "Testar WhatsApp"

### Opção 3: Teste via SDK (Node.js)
```javascript
const functions = require('firebase-functions');

// Chamar função test
await testWhatsAppMessage({
  phone: '+5511987654321',
  template: 'welcome_message'
});
```

---

## ⚠️ STATUS DA INTEGRAÇÃO WHATSAPP

| Componente | Status | Notas |
|------------|--------|-------|
| Número WhatsApp | ✅ Configurado | 779431901927431 |
| Access Token | ✅ Ativo | Token válido |
| Templates | ✅ Aprovados | 10 templates aprovados |
| Webhook | ⚠️ Configurar | URL needs to be registered in Meta |
| IAM Permissions | ✅ OK | allUsers invoker |

---

## 🔧 PRÓXIMOS PASSOS PARA NOTIFICAÇÕES

### 1. Teste Manual
```bash
# Via Firebase Console (recomendado)
# Ou via frontend após implementar UI de testes
```

### 2. Configurar Webhook no Meta for Developers
1. Acesse: https://business.facebook.com/wa/manage/phone-numbers/
2. Configure o webhook URL: `https://southamerica-east1-fisioflow-migration.cloudfunctions.net/whatsappWebhook`
3. Verifique token de verificação

### 3. Implementar Disparo Automático
- Lembretes de agendamento (cron jobs)
- Confirmações automáticas
- Mensagens de aniversário

---

## 📊 SUMÁRIO DE PERMISSÕES POR ROLE

Ver documento completo: `PERMISSOES_ROLES.md`

**Resumo executável:**
- ✅ **Admin**: Acesso total
- ✅ **Fisioterapeuta**: Acesso clínico completo
- ✅ **Estagiário**: Visualização apenas
- ✅ **Recepcionista**: Agenda e cadastro
- ✅ **Paciente**: Dados próprios apenas
