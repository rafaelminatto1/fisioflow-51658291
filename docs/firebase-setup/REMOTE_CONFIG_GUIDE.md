# Firebase Remote Config - Guia de Configuração

## Visão Geral

Este guia explica como configurar o Firebase Remote Config para o FisioFlow, que substitui o antigo Vercel Edge Config para gerenciamento de feature flags.

## Pré-requisitos

- Projeto Firebase criado (`fisioflow-migration`)
- Acesso ao [Firebase Console](https://console.firebase.google.com/)
- Arquivo `src/lib/firebase/remote-config.ts` configurado

---

## 1. Ativar Remote Config

1. Acesse: https://console.firebase.google.com/project/fisioflow-migration/remoteconfig
2. Clique em "Get Started" se for a primeira vez
3. Remote Config será ativado automaticamente

---

## 2. Criar Parâmetros de Configuração

### 2.1 Configuração Padrão

No arquivo `src/lib/firebase/remote-config.ts`, você encontrará os valores padrão em `REMOTE_CONFIG_DEFAULTS`. Use estes valores como referência.

### 2.2 Parâmetros Principais a Criar

Vá em **Remote Config > Parameters** e crie os seguintes parâmetros:

#### Dashboard
| Nome do Parâmetro | Tipo | Valor Padrão | Descrição |
|-------------------|------|--------------|-------------|
| `new_dashboard` | Boolean | `false` | Novo dashboard habilitado |
| `dashboard_v2` | Boolean | `false` | Dashboard v2 com widgets |

#### Recursos de IA
| Nome do Parâmetro | Tipo | Valor Padrão | Descrição |
|-------------------|------|--------------|-------------|
| `ai_enabled` | Boolean | `true` | IA habilitada |
| `ai_transcription` | Boolean | `true` | Transcrição automática |
| `ai_chatbot` | Boolean | `true` | Chatbot de IA |
| `ai_exercise_suggestions` | Boolean | `true` | Sugestões de exercícios |
| `ai_clinical_analysis` | Boolean | `true` | Análise clínica por IA |
| `ai_treatment_planning` | Boolean | `true` | Planejamento de tratamento |
| `ai_patient_chat` | Boolean | `true` | Chat com paciente |
| `ai_progress_analysis` | Boolean | `true` | Análise de progresso |
| `ai_default_model` | String | `gemini-2.5-flash` | Modelo IA padrão |
| `ai_clinical_model` | String | `gemini-2.5-pro` | Modelo para clínica |
| `ai_max_requests_per_hour` | Number | `100` | Limite de requisições/hora |
| `ai_max_requests_per_day` | Number | `1000` | Limite de requisições/dia |
| `ai_daily_budget_limit` | Number | `50` | Limite de orçamento diário (USD) |
| `ai_monthly_budget_limit` | Number | `1000` | Limite de orçamento mensal (USD) |

#### Recursos Clínicos
| Nome do Parâmetro | Tipo | Valor Padrão | Descrição |
|-------------------|------|--------------|-------------|
| `digital_prescription` | Boolean | `true` | Prescrição digital |
| `pain_map_v2` | Boolean | `false` | Mapa de dor v2 |
| `soap_records_v2` | Boolean | `true` | Registros SOAP v2 |
| `telemedicine_enabled` | Boolean | `true` | Telemedicina |
| `exercise_prescription_v2` | Boolean | `true` | Prescrição de exercícios v2 |

#### Analytics
| Nome do Parâmetro | Tipo | Valor Padrão | Descrição |
|-------------------|------|--------------|-------------|
| `advanced_analytics` | Boolean | `true` | Analytics avançados |
| `patient_reports_v2` | Boolean | `false` | Relatórios de pacientes v2 |
| `revenue_analytics` | Boolean | `true` | Analytics de receita |

#### Integrações
| Nome do Parâmetro | Tipo | Valor Padrão | Descrição |
|-------------------|------|--------------|-------------|
| `whatsapp_notifications` | Boolean | `true` | Notificações WhatsApp |
| `google_calendar_sync` | Boolean | `true` | Sincronização Google Calendar |
| `stripe_integration` | Boolean | `true` | Integração Stripe |
| `email_notifications` | Boolean | `true` | Notificações por email |

#### Sistema
| Nome do Parâmetro | Tipo | Valor Padrão | Descrição |
|-------------------|------|--------------|-------------|
| `maintenance_mode` | Boolean | `false` | Modo de manutenção |
| `beta_features` | Boolean | `false` | Recursos beta |
| `debug_mode` | Boolean | `false` | Modo debug |
| `new_onboarding` | Boolean | `false` | Novo onboarding |

---

## 3. Configurar Condicionais

### 3.1 Valores Condicionais Baseados em Usuário

Para feature flags com rollout gradual (ex: 10%, 50% dos usuários):

1. Crie um parâmetro condicional
2. Defina a condição:
   - **User random**: `0-10` (para 10% dos usuários)
   - **User random**: `0-50` (para 50% dos usuários)

### 3.2 Valores Condicionais Baseados em Atributos

Para rollout baseado em propriedades do usuário:

1. Defina uma condição personalizada
2. Exemplo: `user.email ends with @fisioflow.com`
3. Aplique um valor específico para esse grupo

---

## 4. Publicar Alterações

Após criar/modificar parâmetros:

1. Clique em "Publish Changes"
2. Aguarde a propagação (geralmente leva alguns segundos)
3. As alterações estarão disponíveis para os usuários

---

## 5. Testar Configuração

### No Console do Navegador

```javascript
// No console do Firebase, execute:
fetch('https://fisioflow-migration.web.app/api/remote-config')
  .then(r => r.json())
  .then(data => console.log(data));
```

### No Código da Aplicação

```typescript
import { isFeatureEnabled } from '@/lib/firebase/remote-config';

// Verificar se feature está habilitada
const enabled = await isFeatureEnabled('ai_chatbot');
console.log('AI Chatbot enabled:', enabled);
```

---

## 6. Monitoramento

### Métricas Disponíveis

No Firebase Console > Remote Config > **Conditions**, você pode ver:

- **Fetch count**: Número de buscas do config
- **Active users**: Usuários ativos
- **Parameter usage**: Uso de cada parâmetro

### A/B Testing com Remote Config

Para testar diferentes versões:

1. Crie parâmetros condicionais
2. Use `user.pseudo_id` para segmentação aleatória
3. Analise os resultados no Google Analytics 4

---

## 7. Boas Práticas

1. **Use valores padrão no código** - Sempre defina defaults para quando o Remote Config falhar
2. **Fetch interval adequado** - O código usa 1 hora em produção, 10 minutos em dev
3. **Nomes descritivos** - Use nomes claros para os parâmetros
4. **Teste antes de publicar** - Use o Firebase Emulator para testar
5. **Documente mudanças** - Mantenha histórico de alterações importantes

---

## 8. Troubleshooting

### Remote Config não carrega

```bash
# Verifique se o serviço está ativo
gcloud services list | grep remoteconfig

# Verifique permissões
gcloud projects get-iam-policy fisioflow-migration
```

### Valores incorretos

1. Limpe o cache do navegador
2. Force refresh no app
3. Verifique o `minimumFetchIntervalMillis`

### Erro de permissão

Verifique se o `firebase.json` tem as regras corretas e se as APIs estão habilitadas.

---

## 9. Referências

- [Firebase Remote Config Docs](https://firebase.google.com/docs/remote-config)
- [Remote Config API](https://firebase.google.com/docs/reference/remote-config/rest)
- [Best Practices](https://firebase.google.com/docs/remote-config/best-practices)
