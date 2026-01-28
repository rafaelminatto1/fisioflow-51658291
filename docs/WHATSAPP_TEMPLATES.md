# WhatsApp Message Templates - FisioFlow

Este documento contém os templates de mensagem WhatsApp para submissão e aprovação no Meta Business Suite.

## Informações do WhatsApp Business

- **Phone Number ID**: 779431901927431
- **Phone Number**: +55 11 5874 9885
- **Business Account ID**: 806225345331804
- **App ID**: 2479744142426362

## Como Submeter Templates

1. Acesse: https://business.facebook.com/wa/manage/phone-numbers/
2. Selecione o número: +55 11 5874 9885
3. Vá em "Message Templates"
4. Clique em "Create New Template"
5. Use os templates abaixo

---

## Template 1: Confirmação de Consulta

**Nome do Template**: `appointment_confirmation`
**Categoria**: `APPOINTMENT_UPDATE`
**Idioma**: `pt_BR`

### Conteúdo do Template

```
Olá {{1}}, sua consulta foi confirmada! 🎉

📅 Data: {{2}}
⏰ Horário: {{3}}
👨‍⚕️ Profissional: {{4}}

Endereço: {{5}}

Por favor, chegue 10 minutos antes. Se precisar remarcar, responda esta mensagem.

Atenciosamente,
Equipe FisioFlow
```

**Parâmetros**:
1. {{1}} - Nome do paciente (text)
2. {{2}} - Data da consulta (date)
3. {{3}} - Horário da consulta (time)
4. {{4}} - Nome do profissional (text)
5. {{5}} - Endereço da clínica (text)

### Botões (Opcional)
- **Ver no Mapa**: Open URL (https://maps.google.com/?q={{5}})

---

## Template 2: Lembrete de Consulta

**Nome do Template**: `appointment_reminder`
**Categoria**: `APPOINTMENT_UPDATE`
**Idioma**: `pt_BR`

### Conteúdo do Template

```
🔔 Lembrete de consulta

Olá {{1}}, lembramos que sua consulta é hoje!

⏰ Horário: {{2}}
👨‍⚕️ Profissional: {{3}}

Não se esqueça de vir! 😊

Para cancelar ou remarcar, responda esta mensagem.
```

**Parâmetros**:
1. {{1}} - Nome do paciente (text)
2. {{2}} - Horário (time)
3. {{3}} - Nome do profissional (text)

### Botões (Opcional)
- **Confirmar Presença**: Quick Reply (Confirmar)
- **Remarcar**: Quick Reply (Remarcar)

---

## Template 3: Lembrete de Consulta (24h antes)

**Nome do Template**: `appointment_reminder_24h`
**Categoria**: `APPOINTMENT_UPDATE`
**Idioma**: `pt_BR`

### Conteúdo do Template

```
📅 Lembrete: Consulta amanhã

Olá {{1}},

Sua consulta está agendada para amanhã:
📅 Data: {{2}}
⏰ Horário: {{3}}
👨‍⚕️ Profissional: {{4}}

Endereço: {{5}}

Precisa remarcar? Responda esta mensagem.
```

**Parâmetros**:
1. {{1}} - Nome do paciente (text)
2. {{2}} - Data (date)
3. {{3}} - Horário (time)
4. {{4}} - Nome do profissional (text)
5. {{5}} - Endereço (text)

---

## Template 4: Boas-vindas

**Nome do Template**: `welcome_message`
**Categoria**: `MARKETING`
**Idioma**: `pt_BR`

### Conteúdo do Template

```
Bem-vindo(a) ao FisioFlow! 🏥

Olá {{1}},

É um prazer ter você conosco! Agradecemos por escolher a FisioFlow para seu tratamento fisioterapêutico.

Nossa missão é ajudar você a recuperar seus movimentos e qualidade de vida.

💡 Dica: Você pode agendar suas consultas diretamente pelo nosso app.

Qualquer dúvida, estamos à disposição!

Saúde e movimento,
Equipe FisioFlow
```

**Parâmetros**:
1. {{1}} - Nome do paciente (text)

---

## Template 5: Consulta Cancelada

**Nome do Template**: `appointment_cancelled`
**Categoria**: `APPOINTMENT_UPDATE`
**Idioma**: `pt_BR`

### Conteúdo do Template

```
Consulta cancelada

Olá {{1}},

Sua consulta de {{2}} às {{3}} foi cancelada.

Para reagendar, acesse o app ou responda esta mensagem.

Atenciosamente,
Equipe FisioFlow
```

**Parâmetros**:
1. {{1}} - Nome do paciente (text)
2. {{2}} - Data (date)
3. {{3}} - Horário (time)

### Botões
- **Reagendar**: Quick Reply (Quero reagendar)

---

## Template 6: Confirmação de Pré-cadastro

**Nome do Template**: `precadastro_confirmation`
**Categoria**: `UTILITY`
**Idioma**: `pt_BR`

### Conteúdo do Template

```
Pré-cadastro recebido! ✅

Olá {{1}},

Recebemos seu pré-cadastro com sucesso!

Em breve entraremos em contato para finalizar seu cadastro e agendar sua primeira consulta.

📞 Para atendimento: {{2}}

Equipe FisioFlow
```

**Parâmetros**:
1. {{1}} - Nome do paciente (text)
2. {{2}} - Telefone de contato (phone_number)

---

## Template 7: Mensagem de Aniversário

**Nome do Template**: `birthday_greeting`
**Categoria**: `MARKETING`
**Idioma**: `pt_BR`

### Conteúdo do Template

```
Feliz Aniversário! 🎂🎉

Olá {{1}},

A equipe FisioFlow deseja a você um dia especial cheio de alegria e realizações!

Que seu ano seja de muita saúde e movimento! 💪

Atenciosamente,
Equipe FisioFlow
```

**Parâmetros**:
1. {{1}} - Nome do paciente (text)

---

## Template 8: Reativação de Paciente

**Nome do Template**: `patient_reactivation`
**Categoria**: `MARKETING`
**Idioma**: `pt_BR`

### Conteúdo do Template

```
Sentimos sua falta! 👋

Olá {{1}},

Vi que você não vem à clínica há algum tempo. Como está se sentindo?

Se estiver sentindo alguma dor ou desconforto, é só responder esta mensagem para agendar uma consulta.

Sua saúde é importante para nós! 💙

Equipe FisioFlow
```

**Parâmetros**:
1. {{1}} - Nome do paciente (text)

### Botões
- **Agendar Consulta**: Quick Reply (Quero agendar)
- **Estou bem**: Quick Reply (Estou bem, obrigado)

---

## Instruções de Submissão

### Passo a Passo

1. **Acessar Meta Business Suite**
   - Vá para: https://business.facebook.com/
   - Selecione seu WhatsApp Business Account

2. **Navegar para Templates**
   - Menu: WhatsApp > Manage Phone Numbers
   - Clique no número: +55 11 5874 9885
   - Aba: "Message Templates"

3. **Criar Template**
   - Clique: "Create New Template"
   - Preencha:
     - Template name (ex: `appointment_confirmation`)
     - Category: Selecione a categoria indicada acima
     - Language: Portuguese (Brazil)
     - Content: Cole o conteúdo do template

4. **Adicionar Parâmetros**
   - Clique em cada {{n}} para definir o tipo:
     - `text` para texto
     - `date` para datas
     - `time` para horários
     - `phone_number` para telefones

5. **Adicionar Botões (Opcional)**
   - Se o template tiver botões, adicione na seção "Buttons"
   - Tipos suportados: Quick Reply, Call to Action, Open URL

6. **Enviar para Aprovação**
   - Revise o template
   - Clique "Submit"
   - Aguarde a aprovação da Meta (pode levar 24-48h)

### Dicas para Aprovação

- ✅ Use a categoria correta (UTILITY/APPOINTMENT_UPDATE são aprovados mais rápido)
- ✅ Não use formatação excessiva
- ✅ Evite emojis em excesso
- ✅ Seja claro e direto
- ✅ Inclui informações de contato quando relevante
- ❌ Não prometa coisas que não pode cumprir
- ❌ Não use linguagem enganosa

### Após Aprovação

Após os templates serem aprovados, atualize o arquivo [functions/src/communications/whatsapp.ts](../functions/src/communications/whatsapp.ts) com os nomes dos templates aprovados:

```typescript
export const WHATSAPP_TEMPLATES = {
  APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_REMINDER_24H: 'appointment_reminder_24h',
  WELCOME: 'welcome_message',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  PRECADASTRO_CONFIRMATION: 'precadastro_confirmation',
  BIRTHDAY_GREETING: 'birthday_greeting',
  PATIENT_REACTIVATION: 'patient_reactivation',
} as const;
```

---

## Status de Aprovação

Use esta tabela para acompanhar o status:

| Template | Nome | Categoria | Status | Data Submissão |
|----------|------|-----------|--------|----------------|
| Confirmação | `appointment_confirmation` | APPOINTMENT_UPDATE | ⏳ Pendente | - |
| Lembrete | `appointment_reminder` | APPOINTMENT_UPDATE | ⏳ Pendente | - |
| Lembrete 24h | `appointment_reminder_24h` | APPOINTMENT_UPDATE | ⏳ Pendente | - |
| Boas-vindas | `welcome_message` | MARKETING | ⏳ Pendente | - |
| Cancelado | `appointment_cancelled` | APPOINTMENT_UPDATE | ⏳ Pendente | - |
| Pré-cadastro | `precadastro_confirmation` | UTILITY | ⏳ Pendente | - |
| Aniversário | `birthday_greeting` | MARKETING | ⏳ Pendente | - |
| Reativação | `patient_reactivation` | MARKETING | ⏳ Pendente | - |

---

## Suporte

- **Documentação WhatsApp Cloud API**: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/message-templates
- **Suporte Meta Business**: https://www.facebook.com/business/help
