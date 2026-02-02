# 07. APIs e Integrações

## 🌐 Visão Geral

O FisioFlow utiliza **Firebase Cloud Functions** (Node.js) para operações serverless e integrações com APIs externas.

## ⚡ Cloud Functions

### Estrutura

```
functions/
├── src/
│   ├── index.ts               # Exporta todas as funções
│   ├── prescribeExercise.ts   # Prescrição de exercícios com IA
│   ├── analyzeEvolution.ts    # Análise de evolução com IA
│   ├── sendNotification.ts    # Envio de notificações
│   ├── processPayment.ts      # Processamento de pagamento
│   └── webhookHandler.ts      # Handler de webhooks
└── package.json
```

### Exemplo: Prescrição de Exercícios

```typescript
// functions/src/prescribeExercise.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const prescribeExercise = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Não autenticado');

  const { patientId, exerciseIds, injuryType } = data;
  if (!patientId || !exerciseIds) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const db = admin.firestore();

  // Busca informações do paciente
  const patientSnap = await db.collection('patients').doc(patientId).get();
  const patient = patientSnap.data();

  // Busca exercícios
  const exercisesSnap = await db.collection('exercises').get();
  const exercises = exercisesSnap.docs
    .filter(d => exerciseIds.includes(d.id))
    .map(d => ({ id: d.id, ...d.data() }));

  // IA: Personaliza série/repetições baseado no paciente
  const prescription = await personalizeWithAI(patient, exercises, injuryType);

  // Cria prescrição
  const createdPrescription = await db.collection('prescriptions').add({
    patient_id: patientId,
    therapist_id: context.auth.uid,
    exercises: prescription,
    status: 'active',
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { id: createdPrescription.id, ...prescription };
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
// functions/src/webhookHandler.ts
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
