# Plano: copiar exercícios e protocolos do Supabase com CLI (dados + imagens)

Usar o **Supabase CLI** para exportar dados e mídia e depois popular Firestore (e opcionalmente Cloud SQL) com **todas as características** dos exercícios e protocolos, **incluindo imagens**.

---

## Pré-requisitos

- Supabase CLI instalado (`npm i -g supabase` ou via package manager).
- Projeto linkado: na raiz do repo, `supabase link --project-ref ycvbtjfrchcyvmkvuocu` (senha do DB quando pedido). O `project_id` está em `supabase/config.toml`.
- Variáveis no `.env`: `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`), e para Firebase: `FIREBASE_SERVICE_ACCOUNT_KEY_PATH`.

---

## Passo 1 – Exportar dados com o CLI (backup)

```bash
supabase db dump --linked -f scripts/migration/supabase_exercises_protocols_data.sql --data-only --use-copy -s public
```

Isso gera um SQL com `COPY public.exercises ...` e `COPY public.exercise_protocols ...` (e outras tabelas do schema public). Um script Node pode **ler direto do Supabase** (mais simples que parsear o SQL) e escrever no Firestore; o dump fica como backup. Para Firestore não há restore de SQL; a escrita será feita por script.

---

## Passo 2 – Copiar imagens/vídeos com o CLI

Buckets no Supabase (pelas migrations): `exercise-thumbnails`, `exercise-videos`.

- Listar conteúdo (opcional):
  ```bash
  supabase storage ls s3://exercise-thumbnails --experimental --linked -r
  supabase storage ls s3://exercise-videos --experimental --linked -r
  ```

- Baixar para pasta local:
  ```bash
  mkdir -p scripts/migration/media-from-supabase/exercise-thumbnails scripts/migration/media-from-supabase/exercise-videos
  supabase storage cp s3://exercise-thumbnails ./scripts/migration/media-from-supabase/exercise-thumbnails -r --experimental --linked
  supabase storage cp s3://exercise-videos ./scripts/migration/media-from-supabase/exercise-videos -r --experimental --linked
  ```
  (Confirmar sintaxe com `supabase storage cp --help`; em alguns CLIs o bucket remoto pode ser indicado de outra forma.)

- **Limitação:** a doc do Supabase indica que `storage cp` com upload padrão não é adequado para arquivos **acima de 6MB**. Para vídeos grandes, usar a API do Supabase Storage (ou do Firebase) em um script Node para download/upload em chunks ou signed URLs.

Depois de ter os arquivos locais (ou URLs públicas do Supabase que continuem válidas):

- **Cenário A – Manter URLs do Supabase:** se os buckets forem públicos, não é obrigatório copiar arquivos; só garantir que cada documento de exercício em Firestore (e no PostgreSQL) tenha `image_url`, `thumbnail_url`, `video_url` iguais aos do Supabase.
- **Cenário B – Migrar mídia para Firebase Storage:** script Node que, para cada exercício com `image_url`/`thumbnail_url`/`video_url` apontando para o Supabase, baixa o arquivo (fetch da URL pública ou Supabase Storage API), faz upload para Firebase Storage (bucket único, ex.: `exercise-media`), atualiza a URL no documento e, se aplicável, na linha do PostgreSQL.

---

## Passo 3 – Script de migração (dados completos + opção de mídia)

Criar um script (ex.: `scripts/migration/migrate-exercises-protocols-from-supabase.mjs` ou estender `scripts/migrate-supabase-to-firebase.mjs`) que:

1. **Conecta ao Supabase** (`createClient`) com service role.

2. **Exercícios:**
   - `SELECT * FROM exercises WHERE is_active = true` (ou equivalente) para trazer todas as colunas (name, category, difficulty, description, instructions, video_url, image_url, thumbnail_url, equipment, body_parts, indicated_pathologies, contraindicated_pathologies, sets, repetitions, duration, etc.).
   - Para cada linha, monta o documento no formato esperado pelo **Firestore** (e pelo hook `apps/professional-ios/hooks/useExercises.ts`: `name`, `category`, `difficulty`, `video_url`, `image_url`, `description`, `instructions`, `body_parts`, etc.) e grava na coleção `exercises` (id = UUID do Supabase como string).
   - Opcional: se o app web usar Cloud SQL, o mesmo script (ou um segundo) pode inserir/upsert na tabela `exercises` do Cloud SQL, respeitando o schema esperado por `functions/src/api/exercises.ts` (incluindo `slug`, `display_order`, `is_active`, etc.).

3. **Protocolos:**
   - `SELECT * FROM exercise_protocols` com todas as colunas (name, condition_name, protocol_type, weeks_total, milestones, restrictions, progression_criteria, references, organization_id, created_by, created_at, updated_at).
   - Para cada linha, grava um documento na coleção Firestore `exercise_protocols` com os mesmos campos (IDs e datas como string/ISO ou Timestamp; JSONB como objeto/array).

4. **Imagens (opcional):**
   - Se escolher **Cenário B** (migrar para Firebase Storage): para cada `image_url`/`thumbnail_url`/`video_url` que apontar para o Supabase, baixar o arquivo, subir para Firebase Storage, atualizar o campo no documento do Firestore (e na linha do PostgreSQL, se estiver migrando exercises para o Cloud SQL).
   - Se escolher **Cenário A**, apenas garantir que os documentos criados nos passos 2 e 3 já tenham essas URLs preenchidas a partir do SELECT.

Reutilizar a estrutura de `scripts/migrate-supabase-to-firebase.mjs` (TABLE_CONFIG, batch, dry-run, estado) e adicionar entradas para `exercises` e `exercise_protocols` com `transform` que preserve todos os campos e converta tipos (UUID → string, Date → ISO ou Timestamp).

---

## Passo 4 – Restore opcional no Cloud SQL (exercícios)

Se as Cloud Functions usam **Cloud SQL** e a tabela `exercises` lá estiver vazia:

- **Método 1:** usar o dump gerado no Passo 1: abrir `supabase_exercises_protocols_data.sql`, extrair apenas o bloco `COPY public.exercises ... FROM stdin;` até `\.`, e executar esse trecho no Cloud SQL (ajustando schema/colunas se necessário).
- **Método 2:** no script do Passo 3, além de escrever no Firestore, fazer `INSERT` na tabela `exercises` do Cloud SQL (via `pg` ou connection string do Cloud SQL), mapeando colunas do Supabase para as esperadas pela Cloud Function (`slug`, `display_order`, `duration_minutes`, `sets_recommended`, `reps_recommended`, `precautions`, `benefits`, `tags`, `is_active`, etc.).

---

## Resumo da ordem de execução

1. `supabase link` (se ainda não estiver).
2. `supabase db dump ... --data-only --use-copy -f scripts/migration/supabase_exercises_protocols_data.sql` (backup).
3. `supabase storage cp ...` para `exercise-thumbnails` e `exercise-videos` (imagens locais).
4. Script Node: ler `exercises` e `exercise_protocols` do Supabase → escrever em Firestore (e opcionalmente Cloud SQL para exercises); preservar todas as características; opcionalmente migrar mídia para Firebase Storage e atualizar URLs.
5. (Opcional) Restore do COPY de `exercises` no Cloud SQL a partir do dump, se não tiver feito pelo script.

Com isso, os exercícios passam a aparecer na página de exercícios (web e iOS) e os protocolos na página de protocolos (web), **incluindo imagens** e todas as propriedades que existirem no Supabase.
