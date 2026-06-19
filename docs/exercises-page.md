# Guia de Desenvolvimento: Página e Biblioteca de Exercícios (Exercises Page & Library)

> [!IMPORTANT]
> **ATENÇÃO LLMs E AGENTES DE CODIFICAÇÃO:**
> Antes de fazer qualquer modificação nesta página ou em seus componentes, leia atentamente as instruções abaixo para garantir a conformidade e integridade do design e da arquitetura do FisioFlow.

---

## 📂 Arquitetura da Tela

A funcionalidade de exercícios é dividida em dois componentes fundamentais no frontend:
1. **Página Principal (Contêiner):** [src/pages/Exercises.tsx](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/Exercises.tsx)
   * Responsável por renderizar a estrutura de layout e as abas (`Tabs`): Biblioteca, Mídias, Templates, Protocolos, IA Assistente e Analytics.
   * Controla a sincronização de parâmetros via URL (`tab` e `patientId`) e lazy loading dos modais.
2. **Componente de Biblioteca:** [src/components/exercises/ExerciseLibrary.tsx](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/exercises/ExerciseLibrary.tsx)
   * Responsável pela busca bilíngue, filtros por grupo muscular, equipamentos, dificuldade e exibição do grid de cards de exercícios.

---

## 🖼️ Diretrizes Críticas para Ilustrações/Imagens de Exercícios

O FisioFlow preza pela máxima performance e excelência visual. Ao adicionar ou modificar ilustrações de exercícios, siga rigidamente as regras abaixo:

### 1. Diretórios de Destino (Obrigatórios)
Para que uma ilustração apareça corretamente em produção (Web App) e no app Mobile, ela **deve ser salva em dois locais**:
* **Frontend Web (Produção):** [apps/web/public/exercises/illustrations/](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/apps/web/public/exercises/illustrations/)
  * *Por quê?* O build do frontend via Cloudflare Workers Assets copia os arquivos deste diretório. Se não estiver aqui, a imagem não aparecerá no moocafisio.com.br.
* **Raiz Compartilhada (Mobile/Geral):** [public/exercises/illustrations/](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/public/exercises/illustrations/)
  * *Por quê?* Usado como repositório de assets para o app React Native e scripts de seed.

### 2. Formato e Compressão
* **Formato:** Exclusivamente `.avif`. Nunca use `.png` ou `.jpg` bruto para novas ilustrações de exercícios.
* **Performance:** Converta imagens geradas PNG usando utilitários como `convert` (ImageMagick) ou `ffmpeg`. O tamanho final do arquivo deve ser extremamente leve (abaixo de **30 KB**).

### 3. Padrão Estético (Aesthetics Core)
* **Estilo:** Ilustração médica/fisioterapêutica vetorial limpa e minimalista.
* **Fundo:** Sólido, branco puro (`#ffffff`). Sem gradientes complexos ou cores de fundo escuras.
* **Elementos:** Apenas a pessoa realizando o exercício com precisão anatômica e, se necessário, setas azuis/vermelhas indicando a direção do movimento.

---

## ⚡ Integração e Banco de Dados (Neon Postgres)

* A biblioteca consome os exercícios através da API `/api/exercises`.
* Os metadados de exercícios (como `image_url` e descrição) são definidos de forma estática no dicionário local do frontend [src/data/exerciseDictionary.ts](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/data/exerciseDictionary.ts) e também populados no banco Neon via script de seed [scripts/migration/seed-exercises.ts](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/migration/seed-exercises.ts) que consome o arquivo [scripts/data/exercises.json](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/data/exercises.json).
* Ao adicionar novos exercícios, certifique-se de cadastrá-los em todos os dicionários e base JSON correspondente para manter a consistência de dados.

---

## ☁️ Infraestrutura Cloudflare & Deployment (Workers Assets)

O deploy do frontend do FisioFlow (`fisioflow-web`) utiliza o novo recurso **Cloudflare Workers Assets** (e não Cloudflare Pages legado):
* **Configuração de Assets:** Definida no [wrangler.toml](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/wrangler.toml) da raiz:
  ```toml
  assets = { directory = "./apps/web/dist", binding = "ASSETS" }
  ```
* **Processo de Deploy:**
  * O build compila o frontend e copia as mídias da pasta `apps/web/public/` para `apps/web/dist/`.
  * O deploy é disparado automaticamente nas GitHub Actions pelo workflow `.github/workflows/production.yml` executando `wrangler deploy --env production`.
  * > [!WARNING]
    > **NUNCA** utilize o comando `wrangler pages deploy` para o frontend deste repositório, pois ele causará falhas de deploy de assets e rotas. Use apenas `wrangler deploy` com os ambientes adequados.

---

## 🗄️ Storage de Mídia (Cloudflare R2)

Os vídeos demonstrativos de exercícios e outras mídias dinâmicas enviadas pelos profissionais não são salvos junto com o código do frontend. Eles utilizam o armazenamento em R2:
* **Buckets Utilizados:**
  * `MEDIA_BUCKET` (`fisioflow-media`): Bucket R2 principal configurado para armazenar os arquivos de vídeo e imagem de exercícios em produção.
  * Mapeamento configurado no `apps/api/wrangler.toml`.
* **Domínio Público de Mídia:**
  * As mídias do bucket são servidas publicamente através do subdomínio configurado na variável de ambiente `R2_PUBLIC_URL = "https://media.moocafisio.com.br"`.
* **Upload e Processamento:**
  * Os uploads de vídeo passam pelo componente de frontend `ExerciseVideoUpload` e pela rota de API `/api/media/upload` que realiza a gravação direta ou via assinatura no Cloudflare R2 de forma segura.

---

## 🚀 Cache da CDN Cloudflare & Invalidação

Para obter a menor latência e carregar ilustrações instantaneamente, o FisioFlow aproveita a rede global da Cloudflare (Edge Caching):
* **Comportamento Padrão de Cache:**
  * Arquivos dentro de `/exercises/illustrations/*` são cacheados pela Cloudflare nas rotas do Edge e retornam `cf-cache-status: HIT`.
  * Os cabeçalhos retornados por padrão são `cache-control: public, max-age=0, must-revalidate`. Isso instrui o navegador a validar se a imagem mudou (usando eTags/If-None-Match), enquanto o Edge da Cloudflare mantém a cópia em cache de longa duração.
* **Cache Busting (Forçar Atualização):**
  * Ao substituir uma imagem com o **mesmo nome de arquivo** (ex: `stir-the-pot.avif`), a CDN da Cloudflare ou os navegadores dos usuários podem servir a imagem antiga em cache temporariamente.
  * Para forçar uma invalidação sem alterar o nome do arquivo, você pode:
    1. Realizar um cache purge específico para a URL no painel da Cloudflare.
    2. Adicionar uma query string de versão ou hash do commit ao referenciar a imagem no frontend (ex: `/exercises/illustrations/stir-the-pot.avif?v=${commitSha}`). O componente `OptimizedImage` preserva essa query string ao realizar o carregamento.

---

## 📐 Regras de Layout e CSS

* O design é construído com Tailwind CSS. Os cards de exercícios devem manter estritamente a proporção `aspect-video` (16:9) nas imagens para evitar cortes e distorções anatômicas.
* O grid principal deve seguir a estrutura responsiva padrão para evitar quebras em telas móveis e desktop.

