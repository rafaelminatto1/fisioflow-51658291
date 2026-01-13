# 07. APIs e Integrações

## 🌐 Visão Geral

O FisioFlow utiliza **Supabase Edge Functions** (Deno runtime) para operações serverless e integrações com APIs externas.

## ⚡ Edge Functions

### Estrutura

```
supabase/functions/
├── _shared/                    # Código compartilhado
│   ├── cors.ts                # CORS middleware
│   ├── rate-limit.ts          # Rate limiting
│   └── auth.ts                # Validação de auth
│
├── prescribe-exercise/         # Prescrição de exercícios com IA
│   └── index.ts
│
├── analyze-evolution/          # Análise de evolução com IA
│   └── index.ts
│
├── send-notification/          # Envio de notificações
│   └── index.ts
│
├── process-payment/            # Processamento de pagamento
│   └── index.ts
│
└── webhook-handler/            # Handler de webhooks
    └── index.ts
```

### Exemplo: Prescrição de Exercícios

```typescript
// supabase/functions/prescribe-exercise/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { patientId, exerciseIds, injuryType } = await req.json();

    // Validação
    if (!patientId || !exerciseIds) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Inicializa Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Busca informações do paciente
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    // Busca exercícios
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*')
      .in('id', exerciseIds);

    // IA: Personaliza série/repetições baseado no paciente
    const prescription = await personalizeWithAI(patient, exercises, injuryType);

    // Cria prescrição
    const { data: createdPrescription } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: patientId,
        exercises: prescription,
        status: 'active',
      })
      .select()
      .single();

    return new Response(JSON.stringify(createdPrescription), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function personalizeWithAI(patient: any, exercises: any[], injuryType?: string) {
  // Integração com OpenAI ou Google AI
  // Retorna exercícios personalizados
  return exercises.map(ex => ({
    ...ex,
    sets: injuryType === 'acute' ? 2 : 3,
    reps: injuryType === 'acute' ? 10 : 12,
    rest_seconds: 60,
  }));
}
```

## 📧 Integrações com Serviços de Email

### SendGrid

```typescript
// lib/email/sendgrid.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(import.meta.env.VITE_SENDGRID_API_KEY);

export async function sendAppointmentReminder(
  email: string,
  patientName: string,
  appointmentDate: Date
) {
  const msg = {
    to: email,
    from: 'noreply@fisioflow.com',
    templateId: 'd-xxxxxxxxxxxx', // Template ID do SendGrid
    dynamic_template_data: {
      patient_name: patientName,
      appointment_date: appointmentDate.toLocaleDateString('pt-BR'),
      appointment_time: appointmentDate.toLocaleTimeString('pt-BR'),
    },
  };

  await sgMail.send(msg);
}
```

### Resend

```typescript
// lib/email/resend.ts
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

export async function sendWelcomeEmail(email: string, name: string) {
  await resend.emails.send({
    from: 'FisioFlow <noreply@fisioflow.com>',
    to: email,
    subject: 'Bem-vindo ao FisioFlow',
    react: WelcomeEmail({ name }),
  });
}
```

## 💳 Integrações de Pagamento

### Stripe

```typescript
// lib/payments/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY);

export async function createPaymentIntent(amount: number, currency: string = 'brl') {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // centavos
    currency,
    metadata: { integration: 'fisioflow' },
  });

  return paymentIntent;
}

export async function confirmWebhook(signature: string, payload: string) {
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    import.meta.env.VITE_STRIPE_WEBHOOK_SECRET
  );

  if (event.type === 'payment_intent.succeeded') {
    // Atualizar status no banco
    const paymentIntent = event.data.object;
    await updatePaymentStatus(paymentIntent.metadata.appointmentId, 'paid');
  }

  return { received: true };
}
```

### Mercado Pago

```typescript
// lib/payments/mercadopago.ts
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN,
});

export async function createPixPayment(amount: number, description: string) {
  const payment = new Payment(client);

  const result = await payment.create({
    transaction_amount: amount,
    description,
    payment_method_id: 'pix',
    payer: {
      email: 'paciente@email.com',
    },
  });

  return result;
}
```

## 🤖 Integrações com IA

### OpenAI

```typescript
// lib/ai/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
});

export async function suggestExercises(
  patientCondition: string,
  injuryType: string
) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Você é um especialista em fisioterapia...',
      },
      {
        role: 'user',
        content: `Sugira exercícios para: ${patientCondition}, tipo: ${injuryType}`,
      },
    ],
    functions: [
      {
        name: 'suggest_exercises',
        description: 'Sugere exercícios baseado na condição',
        parameters: {
          type: 'object',
          properties: {
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  sets: { type: 'number' },
                  reps: { type: 'number' },
                  instructions: { type: 'string' },
                },
              },
            },
          },
        },
      },
    ],
    function_call: { name: 'suggest_exercises' },
  });

  return JSON.parse(completion.choices[0].message.function_call.arguments);
}
```

### Google AI

```typescript
// lib/ai/google.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY);

export async function analyzeEvolution(evolutionText: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `Analise esta evolução de fisioterapia e extraia insights:
${evolutionText}

Responda em JSON com:
- progresso: "melhorou", "estavel", "piorou"
- recomendacoes: array de strings
- nivel_dor: numero de 0-10`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return JSON.parse(text);
}
```

## 📱 Integrações com WhatsApp

### Twilio API for WhatsApp

```typescript
// lib/whatsapp/twilio.ts
import twilio from 'twilio';

const client = twilio(
  import.meta.env.VITE_TWILIO_ACCOUNT_SID,
  import.meta.env.VITE_TWILIO_AUTH_TOKEN
);

export async function sendAppointmentReminder(
  to: string,
  patientName: string,
  appointmentTime: string
) {
  await client.messages.create({
    from: 'whatsapp:+14155238886',
    to: `whatsapp:${to}`,
    body: `Olá ${patientName}! Lembre-te da tua consulta às ${appointmentTime}.`,
  });
}
```

## 📊 Webhooks

### Handler de Webhooks

```typescript
// supabase/functions/webhook-handler/index.ts
serve(async (req) => {
  const signature = req.headers.get('x-webhook-signature');
  const payload = await req.json();

  // Verificar assinatura
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  if (signature !== expectedSignature) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Processar evento
  switch (payload.event) {
    case 'payment.succeeded':
      await handlePaymentSucceeded(payload.data);
      break;
    case 'appointment.cancelled':
      await handleAppointmentCancelled(payload.data);
      break;
    // ... mais eventos
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## 🔗 Recursos Relacionados

- [Arquitetura](./02-arquitetura.md) - Visão geral da arquitetura
- [Banco de Dados](./05-banco-dados.md) - Schema e migrations
- [Deploy Produção](./11-deploy-producao.md) - Configuração de webhooks em produção
