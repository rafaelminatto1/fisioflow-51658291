# Correção de CORS nas Cloud Functions

## Problema
As Cloud Functions estão bloqueando requisições do `localhost:5175` por política de CORS.

## Solução Completa

### Passo 1: Configurar Variáveis de Ambiente (Via CLI)

Execute o script que criei:

```bash
bash scripts/fix-cors-cloud-run.sh
```

**O que o script faz:**
- Configura a variável `CORS_ALLOWED_ORIGINS` em cada Cloud Function
- Permite requisições de `localhost:5175`, `localhost:8080` e produção

### Passo 2: Verificar se as Functions Usam as Variáveis

As Cloud Functions precisam estar programadas para ler `CORS_ALLOWED_ORIGINS` e configurar os headers CORS.

**Código necessário nas Cloud Functions:**

```typescript
// No início do handler da Cloud Function
export const myFunction = onRequest(async (req, res) => {
  // Configurar CORS
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.includes('*')) {
    res.set('Access-Control-Allow-Origin', '*');
  }
  
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
  
  // Responder OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Resto do código da função...
});
```

### Passo 3: Alternativa Rápida (Se as Functions não suportam CORS)

Se as Cloud Functions não estão configuradas para usar CORS, você tem duas opções:

#### Opção A: Atualizar o código das Cloud Functions

Você precisa fazer deploy das functions com o código CORS acima.

#### Opção B: Usar Fallback Direto para Firestore (Temporário)

Já implementei fallback para Appointments. Posso fazer o mesmo para Patients e outras entidades.

## Executando o Script

### Pré-requisitos

1. **Instalar gcloud CLI:**
   ```bash
   # Ubuntu/Debian
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   
   # Ou via snap
   sudo snap install google-cloud-sdk --classic
   ```

2. **Autenticar:**
   ```bash
   gcloud auth login
   ```

3. **Configurar projeto:**
   ```bash
   gcloud config set project fisioflow-migration
   ```

### Executar o Script

```bash
# Dar permissão de execução
chmod +x scripts/fix-cors-cloud-run.sh

# Executar
bash scripts/fix-cors-cloud-run.sh
```

### Saída Esperada

```
🔧 Configurando CORS nas Cloud Functions do Firebase
====================================================

📋 Projeto: fisioflow-migration
📍 Região: southamerica-east1
🌐 Origens permitidas: http://localhost:5175,http://localhost:8080,...

✅ gcloud CLI encontrado
✅ Autenticado como: seu-email@gmail.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Configurando CORS para: appointmentservicehttp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Serviço encontrado
🔄 Atualizando configuração...
✅ CORS configurado com sucesso para appointmentservicehttp

[... repetir para outros serviços ...]

✅ Configuração de CORS concluída!
```

## Verificação

Após executar o script:

1. **Aguarde 1-2 minutos** para as mudanças propagarem
2. **Recarregue a aplicação**: http://localhost:5175
3. **Verifique o console** - os erros de CORS devem desaparecer

### Verificar Configuração

```bash
# Ver configuração de um serviço
gcloud run services describe appointmentservicehttp \
  --region=southamerica-east1 \
  --project=fisioflow-migration \
  --format="value(spec.template.spec.containers[0].env)"
```

## Troubleshooting

### Se os erros de CORS persistirem:

1. **Verifique se as variáveis foram configuradas:**
   ```bash
   gcloud run services describe appointmentservicehttp \
     --region=southamerica-east1 \
     --project=fisioflow-migration
   ```

2. **Verifique os logs das Cloud Functions:**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=appointmentservicehttp" \
     --limit=50 \
     --project=fisioflow-migration
   ```

3. **Se ainda não funcionar:**
   - As Cloud Functions podem não estar programadas para usar CORS
   - Você precisa atualizar o código das functions e fazer deploy
   - OU usar o fallback direto para Firestore (Opção B)

## Opção B: Fallback Direto (Alternativa)

Se não conseguir configurar CORS nas Cloud Functions, posso criar serviços diretos que buscam do Firestore para:

- ✅ Appointments (já implementado)
- ⏳ Patients (posso implementar)
- ⏳ Evolutions (posso implementar)
- ⏳ Outros serviços conforme necessário

**Vantagens:**
- Funciona imediatamente
- Não depende de Cloud Functions
- Mais rápido para desenvolvimento

**Desvantagens:**
- Perde lógica de negócio das Cloud Functions
- Precisa implementar validações no frontend
- Não é ideal para produção

Quer que eu implemente a Opção B enquanto você configura o CORS?
