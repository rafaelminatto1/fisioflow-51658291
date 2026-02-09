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

#### Firebase Cloud Function para Descriptografar

```typescript
// functions/src/decrypt-cpf.ts
// Implementar como Firebase Cloud Function
// Recebe patientId, verifica permissões com Firebase Auth e Admin SDK
// Descriptografa CPF do Firestore/Cloud SQL e retorna
```

### 1.3 Rate Limiting

#### Firebase Cloud Function com Rate Limit

```typescript
// functions/src/rate-limited-api.ts
// Implementar como Firebase Cloud Function
// Usar middleware para rate limiting (ex: express-rate-limit se usando Express)
// Ou implementar lógica de contagem de requisições com Firestore/Redis.
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

### 2.3 Firebase Cloud Function - Checkout

```typescript
// functions/src/create-checkout.ts
// Implementar como Firebase Cloud Function
// Utilizar Firebase Admin SDK para autenticação e interagir com Firestore/Cloud SQL
// Interagir com Stripe para criar sessões de checkout
```

### 2.4 Firebase Cloud Function - Webhook Handler

```typescript
// functions/src/stripe-webhook.ts
// Implementar como Firebase Cloud Function
// Utilizar Firebase Admin SDK para processar eventos do Stripe e atualizar Firestore/Cloud SQL
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
    // Chamada para Firebase Cloud Function
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await user.getIdToken()}`, // Enviar token de autenticação Firebase
      },
      body: JSON.stringify({ voucherId }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

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

### 3.2 Firebase Cloud Function - Chat

```typescript
// functions/src/ai-chat.ts
// Implementar como Firebase Cloud Function
// Utilizar Firebase Admin SDK para autenticação e gerenciar acesso
// Chamar o AI Gateway para processar as mensagens
```

### 3.3 Frontend - Streaming Chat

```typescript
// src/hooks/useAIChat.ts
import { useState } from 'react';
import { getAuth } from 'firebase/auth'; // Importar getAuth do Firebase

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const useAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth(); // Obter instância do Firebase Auth

  const sendMessage = async (content: string) => {
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    let assistantContent = '';

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      const token = await currentUser.getIdToken(); // Obter token de autenticação Firebase
      
      const response = await fetch(
        `/api/ai-chat`, // Chamar o endpoint da Firebase Cloud Function
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // Enviar token de autenticação Firebase
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

### 4.3 Firebase Cloud Function - Send WhatsApp

```typescript
// functions/src/send-whatsapp.ts
// Implementar como Firebase Cloud Function
// Receber dados da mensagem e usar a API do WhatsApp Business
```

### 4.4 Notificações Automáticas (Firebase Scheduled Cloud Function)

```typescript
// functions/src/send-appointment-reminders.ts
// Implementar como Firebase Scheduled Cloud Function (ex: a cada 24h)
// Utilizar Firebase Admin SDK para buscar agendamentos e invocar a função send-whatsapp
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
    // Mock Firebase
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
          # VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          # VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          
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
