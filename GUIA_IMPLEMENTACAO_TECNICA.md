# Guia de Implementação Técnica - FisioFlow

## 🔐 1. Segurança e Auditoria

### 1.1 Auditoria RLS Policies

#### Checklist de Verificação
```sql
-- Verificar todas as tabelas têm RLS habilitada
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;

-- Verificar policies existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Testar acesso não autorizado
-- 1. Como paciente, tentar acessar dados de outro paciente
-- 2. Como estagiário, tentar deletar eventos
-- 3. Como fisio, tentar acessar configurações admin
```

#### Implementação de RLS Faltante
```sql
-- Exemplo: Tabela de documentos sensíveis
CREATE TABLE IF NOT EXISTS sensitive_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  document_type TEXT NOT NULL,
  encrypted_data TEXT NOT NULL, -- Usar pgcrypto
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sensitive_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas admin e fisio do paciente podem ver
CREATE POLICY "Authorized staff can view documents"
ON sensitive_documents FOR SELECT
USING (
  user_is_admin(auth.uid()) OR
  patient_id IN (
    SELECT p.id FROM patients p
    JOIN appointments a ON a.patient_id = p.id
    JOIN profiles pr ON pr.id = a.therapist_id
    WHERE pr.user_id = auth.uid()
  )
);

-- Policy: Apenas admin e fisio podem inserir
CREATE POLICY "Staff can insert documents"
ON sensitive_documents FOR INSERT
WITH CHECK (
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);

-- Nunca permitir update/delete de documentos sensíveis (audit trail)
-- Implementar soft delete se necessário
```

### 1.2 Criptografia de Dados

#### Setup pgcrypto
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função para criptografar CPF
CREATE OR REPLACE FUNCTION encrypt_cpf(cpf TEXT, secret TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(cpf, secret),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para descriptografar CPF
CREATE OR REPLACE FUNCTION decrypt_cpf(encrypted_cpf TEXT, secret TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_cpf, 'base64'),
    secret
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migração: Criptografar CPFs existentes
DO $$
DECLARE
  encryption_key TEXT := 'YOUR_SECRET_KEY_FROM_ENV'; -- Usar secret do Supabase
  patient_record RECORD;
BEGIN
  FOR patient_record IN SELECT id, cpf FROM patients WHERE cpf IS NOT NULL
  LOOP
    UPDATE patients
    SET cpf = encrypt_cpf(patient_record.cpf, encryption_key)
    WHERE id = patient_record.id;
  END LOOP;
END $$;
```

#### Edge Function para Descriptografar
```typescript
// supabase/functions/get-patient-cpf/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Service role para descriptografia
  );

  const { patientId } = await req.json();
  
  // Verificar permissão
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get("Authorization")?.replace("Bearer ", "")
  );
  
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Verificar se user tem permissão
  const hasPermission = await checkPermission(supabase, user.id, patientId);
  if (!hasPermission) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  // Descriptografar CPF
  const { data } = await supabase.rpc('decrypt_cpf', {
    encrypted_cpf: '...', // obter do DB
    secret: Deno.env.get("ENCRYPTION_KEY")
  });

  return new Response(JSON.stringify({ cpf: data }), {
    headers: { "Content-Type": "application/json" }
  });
});
```

### 1.3 Rate Limiting

#### Edge Function com Rate Limit
```typescript
// supabase/functions/_shared/rate-limit.ts
export class RateLimiter {
  private requests = new Map<string, number[]>();

  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    // Remover timestamps antigos
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    
    if (validTimestamps.length >= maxRequests) {
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < 60000);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

// Usar em edge functions
const limiter = new RateLimiter();

serve(async (req) => {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  
  // 10 requests por minuto
  if (!limiter.isAllowed(ip, 10, 60000)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Retry-After": "60" }
    });
  }
  
  // Processar request normalmente
});

// Cleanup periódico
setInterval(() => limiter.cleanup(), 60000);
```

---

## 💳 2. Sistema de Vouchers com Stripe

### 2.1 Setup Stripe

#### Instalação
```bash
# Adicionar Stripe SDK
# Usar ferramenta lov-add-dependency
```

#### Secrets no Supabase
```bash
# Adicionar secrets usando a tool secrets--add_secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2.2 Database Schema

```sql
-- Tabela de vouchers (já existe como mock)
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  sessions_included INT,
  validity_days INT NOT NULL,
  is_unlimited BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  stripe_price_id TEXT, -- ID do Price no Stripe
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Compras de vouchers
CREATE TABLE user_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  voucher_id UUID NOT NULL REFERENCES vouchers(id),
  stripe_payment_intent_id TEXT,
  purchase_date TIMESTAMPTZ DEFAULT now(),
  expiry_date TIMESTAMPTZ NOT NULL,
  sessions_remaining INT,
  status TEXT DEFAULT 'active', -- active, expired, cancelled
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Uso de vouchers (tracking)
CREATE TABLE voucher_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_voucher_id UUID NOT NULL REFERENCES user_vouchers(id),
  appointment_id UUID REFERENCES appointments(id),
  used_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_sessions ENABLE ROW LEVEL SECURITY;

-- Todos podem ver vouchers ativos
CREATE POLICY "Anyone can view active vouchers"
ON vouchers FOR SELECT
USING (is_active = true);

-- Apenas admin pode gerenciar vouchers
CREATE POLICY "Admins can manage vouchers"
ON vouchers FOR ALL
USING (user_is_admin(auth.uid()));

-- Usuários podem ver seus próprios vouchers
CREATE POLICY "Users can view own vouchers"
ON user_vouchers FOR SELECT
USING (auth.uid() = user_id);

-- Staff pode ver todos os vouchers
CREATE POLICY "Staff can view all vouchers"
ON user_vouchers FOR SELECT
USING (user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role]));
```

### 2.3 Edge Function - Checkout

```typescript
// supabase/functions/create-checkout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { voucherId } = await req.json();

    // Buscar voucher
    const { data: voucher, error } = await supabase
      .from("vouchers")
      .select("*")
      .eq("id", voucherId)
      .single();

    if (error || !voucher) {
      throw new Error("Voucher not found");
    }

    // Criar Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: voucher.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/vouchers?success=true`,
      cancel_url: `${req.headers.get("origin")}/vouchers?canceled=true`,
      metadata: {
        user_id: user.id,
        voucher_id: voucherId,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### 2.4 Webhook Handler

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Service role para inserir
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const { user_id, voucher_id } = session.metadata!;

      // Buscar voucher para pegar validade
      const { data: voucher } = await supabase
        .from("vouchers")
        .select("*")
        .eq("id", voucher_id)
        .single();

      // Criar user_voucher
      await supabase.from("user_vouchers").insert({
        user_id,
        voucher_id,
        stripe_payment_intent_id: session.payment_intent,
        expiry_date: new Date(
          Date.now() + voucher.validity_days * 24 * 60 * 60 * 1000
        ).toISOString(),
        sessions_remaining: voucher.sessions_included,
        status: "active",
      });

      // Enviar email de confirmação (opcional)
      // await sendConfirmationEmail(user_id, voucher_id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }
});
```

### 2.5 Frontend - Botão de Compra

```typescript
// src/pages/Vouchers.tsx (atualizar)
const handlePurchase = async (voucherId: string) => {
  if (!user) {
    toast({
      title: "Login necessário",
      description: "Faça login para comprar vouchers.",
      variant: "destructive"
    });
    return;
  }

  setPurchasing(true);
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { voucherId }
    });

    if (error) throw error;

    // Redirecionar para Stripe Checkout
    window.location.href = data.url;
  } catch (error) {
    console.error('Error:', error);
    toast({
      title: "Erro",
      description: "Não foi possível iniciar o checkout.",
      variant: "destructive"
    });
  } finally {
    setPurchasing(false);
  }
};
```

---

## 🤖 3. Integração Lovable AI

### 3.1 Habilitar AI Gateway

```typescript
// Usar a tool ai_gateway--enable_ai_gateway
// Isso criará o secret LOVABLE_API_KEY automaticamente
```

### 3.2 Edge Function - Chat

```typescript
// supabase/functions/ai-chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Você é um assistente inteligente de fisioterapia. 
Suas respostas devem ser:
- Claras e concisas
- Baseadas em evidências
- Sempre recomendar consulta presencial para diagnósticos
- Educativas e empáticas
- Em português brasileiro`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Contate o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 3.3 Frontend - Streaming Chat

```typescript
// src/hooks/useAIChat.ts
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ messages: [...messages, userMessage] }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Failed to start stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg?.role === 'assistant') {
                  lastMsg.content = assistantContent;
                } else {
                  newMessages.push({ role: 'assistant', content: assistantContent });
                }
                return newMessages;
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, isLoading, sendMessage };
};
```

---

## 📱 4. WhatsApp Business Integration

### 4.1 Setup Meta Business

1. Criar conta Meta Business
2. Adicionar número de telefone
3. Obter WhatsApp Business API token
4. Criar message templates

### 4.2 Message Templates

Exemplo de templates para aprovação:
```
Template 1: appointment_reminder
Olá {{1}}, lembrando sua consulta amanhã às {{2}}. Confirme sua presença respondendo SIM.

Template 2: appointment_confirmation
{{1}}, sua consulta foi agendada para {{2}} às {{3}}. Te esperamos!

Template 3: appointment_cancelled
{{1}}, sua consulta de {{2}} foi cancelada. Entre em contato para reagendar.
```

### 4.3 Edge Function - Send WhatsApp

```typescript
// supabase/functions/send-whatsapp/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { to, template, parameters } = await req.json();
  
  const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN");
  const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/\D/g, ''), // Apenas números
          type: "template",
          template: {
            name: template,
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: parameters.map((p: string) => ({ type: "text", text: p })),
              },
            ],
          },
        }),
      }
    );

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### 4.4 Notificações Automáticas

```typescript
// Edge function agendada (cron) para enviar lembretes
// supabase/functions/send-appointment-reminders/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.cron("Send appointment reminders", "0 10 * * *", async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Buscar agendamentos para amanhã
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { data: appointments } = await supabase
    .from("appointments")
    .select(`
      *,
      patient:patients(name, phone),
      therapist:profiles(full_name)
    `)
    .eq("appointment_date", tomorrow.toISOString().split('T')[0])
    .eq("status", "agendado");

  // Enviar WhatsApp para cada agendamento
  for (const apt of appointments || []) {
    if (apt.patient?.phone) {
      await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: apt.patient.phone,
          template: "appointment_reminder",
          parameters: [
            apt.patient.name,
            apt.appointment_time
          ]
        }
      });
    }
  }
});
```

---

## 📊 5. Monitoring e Observabilidade

### 5.1 Setup Sentry

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
});
```

### 5.2 Custom Error Boundary

```typescript
// src/components/error/ErrorBoundary.tsx (melhorar)
import * as Sentry from "@sentry/react";

const ErrorBoundary: React.FC = ({ children }) => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, componentStack, resetError }) => (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Algo deu errado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Nosso time foi notificado e está trabalhando para resolver.
              </p>
              <Button onClick={resetError}>Tentar novamente</Button>
            </CardContent>
          </Card>
        </div>
      )}
      onError={(error, componentStack) => {
        // Log adicional se necessário
        console.error("Error boundary caught:", error, componentStack);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};
```

---

## 🧪 6. Testing Strategy

### 6.1 Unit Tests com Vitest

```typescript
// src/hooks/__tests__/useVouchers.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVouchers } from '../useVouchers';

describe('useVouchers', () => {
  beforeEach(() => {
    // Mock Supabase
  });

  it('should fetch vouchers', async () => {
    const { result } = renderHook(() => useVouchers());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.vouchers).toHaveLength(3);
  });

  it('should handle errors', async () => {
    // Mock error
    const { result } = renderHook(() => useVouchers());
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

### 6.2 E2E Tests com Playwright

```typescript
// e2e/vouchers.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Vouchers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    // Login
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should display vouchers', async ({ page }) => {
    await page.goto('/vouchers');
    await expect(page.locator('text=Treinos Complementares')).toBeVisible();
    await expect(page.locator('[data-testid="voucher-card"]')).toHaveCount(3);
  });

  test('should purchase voucher', async ({ page }) => {
    await page.goto('/vouchers');
    await page.click('[data-testid="buy-voucher"]:first-child');
    
    // Deve redirecionar para Stripe
    await page.waitForURL(/checkout.stripe.com/);
  });
});
```

---

## 🚀 7. Deploy e CI/CD

### 7.1 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          
      - name: Build
        run: npm run build
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

*Este guia deve ser atualizado conforme novas funcionalidades são implementadas.*
