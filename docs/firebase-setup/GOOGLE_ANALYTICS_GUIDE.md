# Google Analytics 4 - Guia de Configuração

## Visão Geral

Este guia explica como configurar o Google Analytics 4 (GA4) para o FisioFlow, que substitui o Vercel Analytics.

## Pré-requisitos

- Projeto Firebase criado (`fisioflow-migration`)
- Conta Google configurada
- Arquivo `src/lib/monitoring.ts` configurado

---

## 1. Obter o Measurement ID

### 1.1 Criar Propriedade GA4 no Firebase

1. Acesse: https://console.firebase.google.com/project/fisioflow-migration/analytics
2. Clique em "Set up Google Analytics"
3. Aceite os termos e continue
4. Selecione ou crie uma conta GA4
5. Copie o **Measurement ID** (formato: `G-XXXXXXXXXX`)

### 1.2 Adicionar ao Projeto

No arquivo `.env`:

```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 2. Configurar o gtag.js

### 2.1 O gtag.js é carregado automaticamente

O arquivo `src/lib/monitoring.ts` já contém a implementação do GA4 com `window.gtag`.

### 2.2 Inicialização no App.tsx

A inicialização já está configurada em `src/lib/monitoring.ts`:

```typescript
export function initGoogleAnalytics(measurementId: string): void {
  if (typeof window === 'undefined') return;

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };

  // Configure GA4
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
  });
}
```

---

## 3. Eventos Personalizados

### 3.1 Eventos Automaticamente Rastreados

O sistema já rastreia automaticamente:

| Evento | Descrição |
|---------|-----------|
| `page_load_time` | Tempo de carregamento da página |
| `api_response_time` | Tempo de resposta da API |
| `error_rate` | Taxa de erros |
| `user_engagement` | Engajamento do usuário |
| `pwa_install` | Instalação do PWA |
| `offline_usage` | Uso offline |
| `web_vitals` | Core Web Vitals (LCP, FID, CLS, INP) |

### 3.2 Eventos de Negócio

Para rastrear eventos específicos do FisioFlow:

```typescript
import { trackEvent } from '@/lib/monitoring';

// Rastrear criação de paciente
trackEvent('patient_created', { patientId: '123', role: 'patient' });

// Rastrear agendamento
trackEvent('appointment_scheduled', {
  patientId: '123',
  therapistId: '456',
  date: '2026-02-01'
});

// Rastrear completion de exercício
trackEvent('exercise_completed', {
  patientId: '123',
  exerciseId: 'ex-456',
  duration: 300
});
```

---

## 4. Configurar Conversões

### 4.1 Criar Eventos de Conversão

No GA4 Console > **Configure** > **Events** > **Create Event**:

1. Nome do evento: `appointment_booked`
2. Categoria: `engagement`
3. Parâmetros:
   - `patient_id` (text)
   - `therapist_id` (text)
   - `appointment_type` (text)

### 4.2 Criar Funil de Conversão

Para rastrear fluxos:

1. Vá em **Configure** > **Conversions**
2. Crie nova conversão
3. Configure os eventos que compõem a conversão

---

## 5. Integração com BigQuery (Opcional)

### 5.1 Habilitar Link do BigQuery

1. No GA4 Console > **Admin** > **BigQuery Linking**
2. Clique em "Link"
3. Selecione o projeto BigQuery
4. Configure as tabelas de exportação

### 5.5 Consultas Úteis

```sql
-- Tempo médio de carregamento da página
SELECT
  AVG(event_params.value.int_value) as avg_load_time
FROM `fisioflow-migration.analytics_*`
WHERE event_name = 'page_load_time'
  AND event_params.key = 'value'
GROUP BY 1;

-- Core Web Vitals
SELECT
  event_name,
  AVG(event_params.value.int_value) as avg_value
FROM `fisioflow-migration.analytics_*`
WHERE event_name LIKE 'web_vital_%'
GROUP BY event_name;
```

---

## 6. Debug e Validação

### 6.1 GA4 DebugView

1. Acesse: https://analytics.google.com/analytics/web/#/p0/settings/
2. Clique em **DebugView**
3. Abra seu site
4. Veja os eventos em tempo real

### 6.2 Extensão Google Analytics Debugger

1. Instale a extensão no Chrome
2. Acesse seu site
3. Clique no ícone do GA na barra de endereços
4. Verifique se os eventos estão sendo enviados

---

## 7. Filtros e Vistas

### 7.1 Filtrar Tráfego Interno

Para excluir tráfego de desenvolvimento:

1. Vá em **Admin** > **Data Filters** > **Create Filter**
2. Nome: `Internal Traffic`
3. Defina as condições:
   - `event_name` contém `test_`
   - OU `debug_mode` = `true`

### 7.2 Criar Views

1. Vá em **Admin** > **Account Settings** > **Data Display**
2. Adicione views para diferentes ambientes:
   - `Production View` - Todos os dados
   - `Staging View` - Sem testes
   - `Dev View` - Apenas desenvolvimento

---

## 8. Privacy e Compliance

### 8.1 Anonimização de IP

Habilitado por padrão no GA4:

```typescript
window.gtag('config', 'G-XXXXXXXXXX', {
  anonymize_ip: true,
});
```

### 8.2 Consentimento (GDPR/LGPD)

O código já respeita as configurações de privacy do usuário. Para adicionar banner de consentimento:

```typescript
// Somente rastrear após consentimento
if (userConsent) {
  window.gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'granted',
  });
}
```

---

## 9. Painéis Personalizados

### 9.1 Criar Painel de KPIs Clínicos

1. Vá em **Explore** > **Reports**
2. Crie novo relatório
3. Adicione tiles:
   - Pacientes ativos
   - Consultas agendadas
   - Exercícios completados
   - Taxa de retenção

### 9.2 Compartilhar Relatórios

1. Abra o relatório
2. Clique em **Share**
3. Copie o link ou configure compartilhamento por email

---

## 10. Troubleshooting

### Eventos não aparecem

```bash
# Verifique se gtag.js está carregado
curl -I https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX
```

### Erro de CORS

Verifique se o domínio está autorizado no GA4 Console.

### Dados demorando a aparecer

1. Dados do GA4 levam até 24 horas para aparecer
2. Use **Realtime** view para dados imediatos
3. Verifique o fuso horário nos relatórios

---

## 11. Referências

- [Google Analytics 4 Docs](https://support.google.com/analytics/answer/9214168)
- [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/ga4)
- [gtag.js Reference](https://developers.google.com/analytics/devguides/collection/gtagjs)
- [Firebase Analytics Integration](https://firebase.google.com/docs/analytics)
