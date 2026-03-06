# Plano: Firebase Auth + Neon PostgreSQL + Vercel
**Data:** 2026-03-03
**Escopo:** Exercícios, Imagens, Protocolos, Wiki

---

## Stack Final

| Camada | Tecnologia | Motivo |
|---|---|---|
| **Hosting** | Vercel | PR previews, auto-deploy GitHub, gratuito |
| **Frontend** | React + Vite (sem mudanças) | Já funciona |
| **Auth** | Firebase Auth | Já integrado, excelente, gratuito |
| **Storage** | Firebase Storage | Imagens/vídeos exercícios, já integrado |
| **AI** | Firebase AI Logic (Gemini 2.0 Flash) | Gratuito, já usado |
| **Push** | Firebase FCM | Gratuito, já configurado |
| **Database** | Neon PostgreSQL (São Paulo) | Substitui Cloud SQL + Firestore |
| **ORM** | Drizzle ORM | Já configurado no projeto |
| **Backend API** | Firebase Cloud Functions | Já existe, só muda a conexão DB |

---

## Fases de Implementação

### FASE 1: Setup Neon + Drizzle Schema
**Pré-requisito (ação do usuário):** Criar conta em neon.com → projeto na região "AWS South America (São Paulo)" → copiar DATABASE_URL

1. Adicionar `DATABASE_URL` ao `.env` e variáveis da Vercel
2. Criar `src/server/db/schema/exercises.ts` — tabela de exercícios completa
3. Criar `src/server/db/schema/protocols.ts` — protocolos de tratamento
4. Criar `src/server/db/schema/wiki.ts` — páginas wiki + histórico de versões
5. Atualizar `src/server/db/schema/index.ts` para exportar os novos schemas
6. Rodar `pnpm db:push` → cria tabelas no Neon automaticamente

### FASE 2: Seed Data Rico
Criar `scripts/seed-neon.ts` com dados reais de fisioterapia:

**Exercícios (60+):**
- Categorias: Ortopedia, Neurologia, Respiratório, Esportivo, Coluna, Ombro/Joelho/Quadril
- Campos: nome, descrição, instruções passo-a-passo, músculos trabalhados, equipamentos, dificuldade, vídeo URL, image URL, patologias indicadas/contraindicadas
- Imagens: URLs públicas de imagens reais de exercícios (ou Firebase Storage)

**Protocolos (20+):**
- ACL pós-cirúrgico (12 semanas)
- Ombro pós-cirúrgico (16 semanas)
- Lombalgia crônica (8 semanas)
- Cervicalgia (6 semanas)
- AVC reabilitação (20 semanas)
- Joelho artroplastia (12 semanas)
- Cada protocolo tem: semanas, milestones, restrições, exercícios por fase, critérios de progressão, referências

**Wiki (15+ páginas):**
- Guia SOAP clínico
- Escalas de dor (EVA, NPRS, PSFS)
- Testes ortopédicos especiais
- Protocolos de avaliação
- Conduta para patologias comuns

### FASE 3: Neon na Cloud Function
Atualizar `functions/src/init.ts`:
- Substituir lógica complexa de Cloud SQL (secrets, socket Unix, IP público) por simples `DATABASE_URL`
- Adicionar `@neondatabase/serverless` (melhor para serverless/cold starts que `pg`)
- Manter Drizzle ORM nas queries (substituir raw SQL de `exercises.ts`)

### FASE 4: Atualizar Serviços Frontend
4.1 **Exercícios**: Atualizar `src/services/exercises.ts` para chamar o endpoint da Cloud Function (já existe `listExercisesHttp`) em vez de Firestore
4.2 **Protocolos**: Criar endpoint na Cloud Function + atualizar `useExerciseProtocols.ts`
4.3 **Wiki**: Criar endpoint na Cloud Function + atualizar `src/pages/Wiki.tsx`

### FASE 5: Vercel Deploy
1. Criar `vercel.json` com config para Vite SPA
2. Configurar env vars na Vercel (VITE_FIREBASE_*, DATABASE_URL)
3. Conectar repositório GitHub → auto-deploy
4. Configurar domínio custom (opcional)

---

## Schema das novas tabelas

### exercises
```sql
id UUID PRIMARY KEY
name VARCHAR(200) NOT NULL
slug VARCHAR(200) UNIQUE
category VARCHAR(100)        -- 'ortopedia', 'neurologia', etc.
subcategory VARCHAR(100)     -- 'joelho', 'ombro', 'coluna', etc.
description TEXT
instructions TEXT[]          -- passo a passo como array
muscles_primary TEXT[]       -- músculos principais
muscles_secondary TEXT[]     -- músculos secundários
body_parts TEXT[]            -- partes do corpo
equipment TEXT[]             -- equipamentos necessários
difficulty VARCHAR(20)       -- 'iniciante', 'intermediario', 'avancado'
duration_minutes INTEGER
sets_recommended INTEGER
reps_recommended INTEGER
rest_seconds INTEGER
video_url TEXT               -- Firebase Storage ou YouTube
image_url TEXT               -- Firebase Storage
thumbnail_url TEXT
tags TEXT[]
pathologies_indicated TEXT[] -- indicado para
pathologies_contraindicated TEXT[] -- contraindicado para
is_active BOOLEAN DEFAULT true
is_public BOOLEAN DEFAULT true  -- visível para todos os orgs
organization_id UUID         -- NULL = exercício padrão da plataforma
created_by TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### exercise_categories
```sql
id UUID PRIMARY KEY
slug VARCHAR(100) UNIQUE
name VARCHAR(200)
description TEXT
icon TEXT                    -- emoji ou nome do ícone
color TEXT                   -- cor hex
order_index INTEGER
parent_id UUID REFERENCES exercise_categories(id)
```

### exercise_protocols
```sql
id UUID PRIMARY KEY
name VARCHAR(200) NOT NULL
slug VARCHAR(200) UNIQUE
condition_name VARCHAR(200)  -- ex: 'Reconstrução LCA'
protocol_type VARCHAR(50)    -- 'pos_operatorio', 'patologia', 'preventivo'
icd10_codes TEXT[]
weeks_total INTEGER
phases JSONB                 -- [{week_start, week_end, name, goals, exercises[]}]
milestones JSONB             -- [{week, title, criteria}]
restrictions JSONB           -- [{week_start, week_end, restriction}]
progression_criteria JSONB
references JSONB             -- [{title, authors, year, doi, url}]
clinical_tests TEXT[]        -- IDs dos testes clínicos recomendados
evidence_level VARCHAR(10)   -- 'A', 'B', 'C', 'D'
is_active BOOLEAN DEFAULT true
is_public BOOLEAN DEFAULT true
organization_id UUID
created_by TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### protocol_exercises
```sql
id UUID PRIMARY KEY
protocol_id UUID REFERENCES exercise_protocols(id)
exercise_id UUID REFERENCES exercises(id)
phase_week_start INTEGER
phase_week_end INTEGER
sets_recommended INTEGER
reps_recommended INTEGER
frequency_per_week INTEGER
progression_notes TEXT
order_index INTEGER
```

### wiki_pages
```sql
id UUID PRIMARY KEY
slug VARCHAR(300) UNIQUE
title VARCHAR(500) NOT NULL
content TEXT                 -- Markdown
html_content TEXT            -- Cache renderizado
icon TEXT                    -- emoji
cover_image TEXT
parent_id UUID REFERENCES wiki_pages(id)
organization_id UUID         -- NULL = página pública da plataforma
created_by TEXT
updated_by TEXT
tags TEXT[]
category VARCHAR(100)
is_published BOOLEAN DEFAULT true
is_public BOOLEAN DEFAULT true
view_count INTEGER DEFAULT 0
version INTEGER DEFAULT 1
deleted_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### wiki_page_versions
```sql
id UUID PRIMARY KEY
page_id UUID REFERENCES wiki_pages(id)
title VARCHAR(500)
content TEXT
version INTEGER
created_by TEXT
comment TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

---

## Hosting: Firebase vs Vercel

### Por que Vercel para o FisioFlow Web

| | Firebase Hosting | Vercel |
|---|---|---|
| Preview PRs | ❌ | ✅ (killer feature) |
| Auto-deploy GitHub | ✅ | ✅ |
| Analytics | ❌ | ✅ Integrado |
| Vite suporte | ✅ | ✅ Nativo |
| Free bandwidth | 360MB/dia | 100GB/mês |
| Rollback | ❌ | ✅ 1 clique |
| Edge Functions | ❌ | ✅ |
| Config | firebase.json | vercel.json (3 linhas) |
| CLI | firebase deploy | vercel --prod |

**Backend (Cloud Functions)**: continua no Firebase. Vercel só hospeda o frontend estático.

---

## vercel.json (configuração mínima)
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

---

## Seed Data: Exercícios (amostra)

### Categorias
- Ortopedia (Joelho, Ombro, Coluna, Quadril, Tornozelo, Punho)
- Neurologia (AVC, Parkinson, Esclerose)
- Respiratório (DPOC, Asma, Pós-COVID)
- Esportivo (Retorno ao esporte, Prevenção)
- Funcional (AVDs, Equilíbrio, Core)
- Pós-cirúrgico

### Exercícios de Joelho (exemplo)
1. Agachamento na parede (Wall Squat) — intermediário
2. Elevação de perna reta — iniciante
3. Extensão de joelho na cadeira — iniciante
4. Flexão de joelho em pé — iniciante
5. Step up frontal — intermediário
6. Mini agachamento (0-45°) — iniciante
7. Terminal Knee Extension (TKE) com thera-band — intermediário
8. Leg press 60° — intermediário

### Protocolos (exemplo completo)
**Protocolo ACL Pós-cirúrgico (12 semanas)**
- Fase 1 (1-2): Controle da dor/edema, amplitude passiva
- Fase 2 (3-4): Fortalecimento VMO, propriocepção inicial
- Fase 3 (5-6): Cadeia cinética fechada, bicicleta
- Fase 4 (7-9): Fortalecimento funcional, corrida leve
- Fase 5 (10-12): Retorno ao esporte, agilidade
- Milestone crítico: Extensão completa na semana 2
- Referências: Wilk et al. 2012, Manske et al. 2012

---

## Prioridade de Execução

1. ✅ **Criar conta Neon** (usuário — 5 min)
2. ✅ **Criar schemas** no Drizzle e rodar `db:push`
3. ✅ **Seed data** — exercícios + protocolos + wiki
4. ✅ **Atualizar init.ts** — trocar Cloud SQL por Neon
5. ✅ **Atualizar services** — exercícios via API (não Firestore)
6. ✅ **Vercel setup** — vercel.json + deploy
7. ⏳ **Protocolos via API** — Cloud Function endpoint
8. ⏳ **Wiki via API** — Cloud Function endpoint
