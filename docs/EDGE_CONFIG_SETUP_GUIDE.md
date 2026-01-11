# 🔧 Guia Passo a Passo - Criar Edge Config no Vercel Dashboard

O navegador foi aberto em: https://vercel.com/rafael-minattos-projects/fisioflow-lovable

## 📍 Onde Encontrar Edge Config

### Método 1: Pela Aba "Settings"

1. **No dashboard do projeto**, você verá várias abas no topo:
   ```
   [ Overview | Deployments | Logs | Analytics | ... ]
   ```

2. Clique na aba **"Settings"** (engrenagem ⚙️)

3. No menu lateral esquerdo, procure por:
   - **"Edge Config"** ou
   - **"Storage"** → depois "Edge Config"

4. Clique em **"Create Edge Config"**

### Método 2: Pela Aba "Storage" (se existir)

1. Clique na aba **"Storage"** (ícone de banco de dados 💾)

2. Você verá opções:
   - Blob
   - Edge Config
   - Marketplace (KV, Postgres, etc.)

3. Clique em **"Edge Config"**

4. Clique em **"Create"**

---

## 🎯 Criando o Edge Config

### Passo 1: Nomear o Edge Config

```
Name: fisioflow-features
```

Clique em **"Continue"**

### Passo 2: Adicionar Configuração Inicial

Copie e cole este JSON:

```json
{
  "features": {
    "new_dashboard": false,
    "ai_transcription": true,
    "ai_chatbot": true,
    "ai_exercise_suggestions": true,
    "digital_prescription": true,
    "pain_map_v2": false,
    "soap_records_v2": false,
    "advanced_analytics": true,
    "patient_reports_v2": false,
    "whatsapp_notifications": true,
    "google_calendar_sync": true,
    "maintenance_mode": false,
    "beta_features": false
  }
}
```

Clique em **"Create"**

### Passo 3: Copiar a URL do Edge Config

Após criar, você verá uma URL como:

```
https://edge-config.vercel.com/ecfg_xxxxxxxxxxxx
```

**Copie essa URL!**

---

## 🔧 Adicionar ao Projeto Vercel

### 1. No Dashboard

1. Ainda no **Settings**
2. Clique em **"Environment Variables"**
3. Clique em **"Add New"**
4. Adicione:

   **Nome:** `EDGE_CONFIG`
   **Valor:** `https://edge-config.vercel.com/ecfg_xxxxxxxxxxxx` (a URL que você copiou)

5. Selecione os ambientes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

6. Clique em **"Save"**

### 2. Via CLI (Alternativa)

Se você quiser adicionar via CLI:

```bash
vercel env add EDGE_CONFIG production
# Cole a URL quando solicitado
```

---

## 🧪 Testar se Funcionou

### 1. Verificar no Código

```typescript
import { get } from '@vercel/edge-config';

const features = await get('features');
console.log(features);
// Deve mostrar o objeto JSON com as features
```

### 2. Testar uma Feature Flag

```typescript
import { isFeatureEnabled } from '@/lib/featureFlags/edgeConfig';

const enabled = await isFeatureEnabled('ai_transcription');
console.log('AI Transcription:', enabled);
// Deve mostrar: true
```

---

## 🆘 Se Você Não Conseguir Encontrar

### Opção A: Edge Config pode não estar disponível

Em alguns projetos/planos, Edge Config pode estar em diferentes locais:

1. **Verifique seu plano:**
   - Edge Config disponível em: Hobby, Pro, Enterprise
   - Se você está em um plano antigo, pode precisar atualizar

2. **Procure em "Integrations":**
   - Settings → Integrations
   - Procure por "Edge Config"

3. **Use o search do dashboard:**
   - Pressione `Cmd+K` (Mac) ou `Ctrl+K` (Windows)
   - Digite "Edge Config"
   - Selecione a opção

### Opção B: Criar via Vercel CLI (Alternativa)

Se o dashboard não funcionar, você pode tentar criar via API:

```bash
# Verificar se o projeto tem Edge Config
vercel ls

# Abrir configurações do projeto
vercel pull

# Verificar se existe edge-config em vercel.json
cat vercel.json | grep -i "edge-config"
```

### Opção C: Usar Variáveis de Ambiente (Fallback)

Se Edge Config não estiver disponível, você pode usar features flags via environment variables:

```bash
# No .env.local
VITE_FEATURE_NEW_DASHBOARD=false
VITE_FEATURE_AI_TRANSCRIPTION=true
VITE_FEATURE_AI_CHATBOT=true
# etc...
```

E no código:

```typescript
const isNewDashboardEnabled = import.meta.env.VITE_FEATURE_NEW_DASHBOARD === 'true';
```

---

## 📊 Troubleshooting

### Problema: "Edge Config não aparece"

**Solução:**
1. Verifique se você está no time correto
   ```bash
   vercel whoami
   ```

2. Liste todos os projetos
   ```bash
   vercel ls
   ```

3. Verifique se o projeto está correto
   ```bash
   vercel link
   ```

### Problema: "Permissão negada"

**Solução:**
- Verifique se você tem permissão de "Owner" ou "Member"
- Peça ao dono do projeto para adicionar você

### Problema: "Edge Config esgotado"

**Solução:**
- Pro plan: 20 Edge Configs por projeto
- Enterprise: Ilimitado
- Hobby: 3 Edge Configs por projeto

---

## ✅ Checklist

Antes de continuar:

- [ ] Dashboard aberto no navegador
- [ ] Aba "Settings" encontrada
- [ ] "Edge Config" localizado
- [ ] Edge Config criado com nome "fisioflow-features"
- [ ] JSON inicial adicionado
- [ ] URL do Edge Config copiada
- [ ] Variável EDGE_CONFIG adicionada ao projeto
- [ ] Ambientes selecionados (Production, Preview, Development)
- [ ] Deploy feito para aplicar mudanças

---

## 🚀 Próximo Passo

Após criar o Edge Config:

1. **Adicionar a variável** EDGE_CONFIG ao projeto
2. **Deploy:** `vercel --prod`
3. **Testar:** Use os exemplos de feature flags no código

---

## 💡 Dica

Se você ainda não conseguir encontrar, mande uma mensagem e eu posso:

1. Criar via API REST da Vercel
2. Usar uma abordagem alternativa
3. Ajustar o código para funcionar sem Edge Config

**O importante é que a aplicação vai funcionar mesmo sem Edge Config!** As features flags podem ser feitas de outras formas.
