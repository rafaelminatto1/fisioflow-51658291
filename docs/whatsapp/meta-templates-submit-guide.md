# Guia — Submeter templates WhatsApp na Meta Business

**Status**: ação do usuário. Taxa de falha atual: **51.6%** (sem templates aprovados).
**Prazo de aprovação Meta**: 24–72h (geralmente <24h para templates simples).

## Por que isso é crítico

Hoje você está enviando "(sem template)" em 27 de 31 mensagens — essas caem no limite de **24h conversation window** do WhatsApp Business Platform. Fora dessa janela, enviar sem template **falha sempre**. Por isso 51.6% de falha.

Templates aprovados permitem:
- Enviar mensagens proativas (lembretes D-3, D-1, D-0) fora da janela de 24h
- Usar variáveis `{{1}}`, `{{2}}`, etc. para personalizar
- Mensagens de utilidade (lembretes) têm custo reduzido

## Como submeter

### 1. Acesso
1. Entrar em **https://business.facebook.com** (sua Meta Business conta)
2. Menu lateral → **WhatsApp Manager** → **Templates de mensagem**
3. Botão azul "Criar template"

### 2. Configurações padrão para todos os templates

| Campo | Valor |
|---|---|
| Idioma | **Português (BR)** |
| Categoria | **Utility** (lembretes, confirmações, cancelamentos) ou **Marketing** (pacotes, campanhas) |

## Templates a submeter (copiar exato)

### 1. `appointment_reminder_d3` — Lembrete 3 dias antes

- **Categoria**: Utility
- **Nome**: `appointment_reminder_d3`
- **Idioma**: Português (BR)
- **Body**:
```
Olá, {{1}}! Passando para lembrar da sua sessão de fisioterapia na {{2}} em *{{3}}* às *{{4}}*.

Está tudo certo para comparecer? Responda *Sim* para confirmar ou *Reagendar* se precisar mudar o horário.
```
- **Exemplos (para aprovação)**:
  - `{{1}}` = Maria
  - `{{2}}` = Clínica Moocafisio
  - `{{3}}` = 28/04
  - `{{4}}` = 14:30

---

### 2. `appointment_reminder_d1` — Lembrete 1 dia antes

- **Categoria**: Utility
- **Nome**: `appointment_reminder_d1`
- **Body**:
```
Oi, {{1}}! Sua sessão de fisioterapia é *amanhã* ({{2}}) às *{{3}}*.

Responda *Confirmar* ou *Cancelar* — sem resposta assumimos presença.
```
- **Exemplos**:
  - `{{1}}` = João
  - `{{2}}` = quinta-feira
  - `{{3}}` = 10:00

---

### 3. `appointment_reminder_d0` — Lembrete mesmo dia (2h antes)

- **Categoria**: Utility
- **Nome**: `appointment_reminder_d0`
- **Body**:
```
{{1}}, lembrete rápido: sua sessão de fisioterapia é *hoje às {{2}}*.

Te esperamos em {{3}}. Qualquer imprevisto, nos avise por aqui.
```
- **Exemplos**:
  - `{{1}}` = Ana
  - `{{2}}` = 16:00
  - `{{3}}` = Rua X, 123

---

### 4. `confirmation_request` — Pedido de confirmação avulso

- **Categoria**: Utility
- **Nome**: `confirmation_request`
- **Body**:
```
Olá, {{1}}. Sua sessão está marcada para *{{2}}* às *{{3}}*.

Por favor, responda *Confirmar* ou *Reagendar* para ajustarmos a agenda.
```
- **Exemplos**:
  - `{{1}}` = Carlos
  - `{{2}}` = 29/04 (segunda)
  - `{{3}}` = 08:30

---

### 5. `reschedule_followup` — Pós-cancelamento, oferta de novos horários

- **Categoria**: Utility
- **Nome**: `reschedule_followup`
- **Body**:
```
Olá, {{1}}. Recebemos seu pedido de reagendamento.

Tenho estas opções disponíveis:
1. {{2}}
2. {{3}}
3. {{4}}

Responda com o número da opção preferida.
```
- **Exemplos**:
  - `{{1}}` = Beatriz
  - `{{2}}` = seg 28/04 às 10:00
  - `{{3}}` = ter 29/04 às 14:30
  - `{{4}}` = qua 30/04 às 17:00

---

### 6. `cancellation_confirmation` — Confirmação de cancelamento

- **Categoria**: Utility
- **Nome**: `cancellation_confirmation`
- **Body**:
```
{{1}}, seu cancelamento da sessão de *{{2}}* às *{{3}}* foi registrado.

Quando quiser remarcar, é só nos enviar uma mensagem aqui. Cuide-se!
```
- **Exemplos**:
  - `{{1}}` = Pedro
  - `{{2}}` = 28/04
  - `{{3}}` = 14:00

---

### 7. `boas_vindas_paciente` — Onboarding pós-primeiro agendamento *(já aprovado — manter)*

Já está aprovado (3 enviadas, 3 lidas 100%). Não precisa submeter de novo.

## Depois da aprovação

Quando Meta aprovar (email notificação), os templates aparecem em `GET /api/whatsapp/templates`. O `AppointmentReminderWorkflow` no Worker vai começar a usar automaticamente.

**Verificar aprovação programaticamente**:
```bash
curl "https://api-pro.moocafisio.com.br/api/whatsapp/templates" -H "Authorization: Bearer $JWT" | jq
```

## Dicas pra evitar rejeição

1. **Nome do template**: só `snake_case`, sem espaços
2. **Não usar**: emojis em excesso, CAPS LOCK, links promocionais, palavras tipo "grátis" em Utility
3. **Variáveis**: devem ser **textuais**, não podem ser URLs nem números sozinhos
4. **Categoria correta**: lembrete/confirmação/cancelamento = **Utility**; campanha = **Marketing**
5. **Body máx 1024 chars**: todos acima estão bem abaixo disso
6. **Texto de exemplo obrigatório**: preencha os 4 exemplos acima no formulário

## Se Meta rejeitar

Razões comuns:
- Template parece spam → tire emojis, tom mais formal
- Categoria errada → mude Marketing ↔ Utility
- Variáveis mal formatadas → use exemplos reais de clínica

## Próximo passo (que eu faço depois da aprovação)

1. Atualizar `apps/api/src/workflows/appointmentReminder.ts` para usar os nomes exatos dos templates aprovados
2. Remover fallback "(sem template)" do send loop
3. Testar D-3 com paciente de teste

---

**Atalho**: você pode copiar-colar os bodies direto no formulário Meta. Template 1 leva ~3 min. Total dos 6 templates: ~15-20 min.
