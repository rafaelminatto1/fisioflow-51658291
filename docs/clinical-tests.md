# Guia de Desenvolvimento: Página e Biblioteca de Testes Clínicos (Clinical Tests Page & Library)

> [!IMPORTANT]
> **ATENÇÃO LLMs E AGENTES DE CODIFICAÇÃO:**
> Antes de fazer qualquer modificação nesta página ou em seus componentes, leia atentamente as instruções abaixo para garantir a conformidade e integridade do design e da arquitetura do acervo de testes do FisioFlow.

---

## 📂 Arquitetura da Tela

A biblioteca de testes clínicos é estruturada pelos seguintes arquivos e componentes principais:
1. **Página Principal (Contêiner):** [src/pages/ClinicalTestsLibrary.tsx](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/pages/ClinicalTestsLibrary.tsx)
   * Controla a busca, filtros e o estado dos modais de criação, edição e detalhamento de testes clínicos.
   * Realiza a consulta da API via `@tanstack/react-query` a partir da rota `/api/clinical/test-templates`.
2. **Grid de Cards:** [src/components/clinical/ClinicalTestsGrid.tsx](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/components/clinical/ClinicalTestsGrid.tsx)
   * Responsável por listar os testes e exibir individualmente cada card com as respectivas imagens.
3. **Catálogo de Dados e Built-ins:** [src/data/clinicalTestsCatalog.ts](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/src/data/clinicalTestsCatalog.ts)
   * Contém a lista estática embutida no frontend (`builtinClinicalTestsCatalog`).
   * Fornece a lógica de merge e normalização (`mergeClinicalTestsCatalog`) que combina os registros recebidos do banco de dados (que podem ter variações de nomes criados por profissionais) com os metadados ricos do catálogo local.

---

## 🖼️ Diretrizes Críticas para Ilustrações de Testes Clínicos

Para que a experiência do usuário seja premium, mantenha a biblioteca de imagens atualizada e performática:

### 1. Diretórios de Destino (Obrigatórios)
Qualquer ilustração criada para testes clínicos **deve ser salva em dois locais**:
* **Frontend Web (Produção):** [apps/web/public/clinical-tests/illustrations/](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/apps/web/public/clinical-tests/illustrations/)
  * *Por quê?* O build do frontend via Cloudflare Workers Assets copia os arquivos deste diretório. Se não estiver aqui, a imagem não aparecerá no site.
* **Raiz Compartilhada (Mobile/Geral):** [public/clinical-tests/illustrations/](file:///home/rafael/Documents/fisioflow/fisioflow-51658291/public/clinical-tests/illustrations/)
  * *Por quê?* Utilizado como repositório de assets para o app mobile em React Native e seed local.

### 2. Formato e Compressão
* **Formato:** Exclusivamente `.avif`. Nunca use `.png` ou `.jpg` bruto para novas ilustrações.
* **Performance:** Use ferramentas como o ImageMagick (`convert`) para gerar imagens leves. O tamanho máximo do arquivo deve ser inferior a **30 KB** para carregamento instantâneo.

### 3. Padrão Estético (Aesthetics Core)
* **Estilo:** Ilustração médica/fisioterapêutica vetorial limpa e minimalista.
* **Fundo:** Sólido, branco puro (`#ffffff`).
* **Elementos:** Apenas a representação do teste (terapeuta e paciente realizando o movimento clínico), com precisão anatômica e sem detalhes faciais complexos.

---

## ⚡ Alinhamento de Dados e Aliases (Merge Protocol)

Os profissionais podem buscar e criar testes com nomes ligeiramente diferentes dos oficiais do acervo de built-ins.
Para evitar duplicidade ou imagem quebrada na tela, o frontend resolve isso através da propriedade `aliases_pt` dentro de `src/data/clinicalTestsCatalog.ts`.
* Se o teste vier da API com uma variação de nome (ex: `"Teste de Gaveta Anterior"`), adicione essa string no array `aliases_pt` do built-in correspondente (ex: `"Gaveta Anterior (Joelho)"`).
* Isso garantirá que o merge associe corretamente o registro do banco à ilustração `.avif` local correspondente.

---

## 🚀 Cache da CDN Cloudflare & Invalidação

As ilustrações clínicas usam cache de borda de longa duração na Cloudflare.
* Se precisar atualizar uma imagem existente mantendo o mesmo nome de arquivo (ex: `apley-compression.avif`), você deve forçar uma invalidação (purge) no painel da Cloudflare ou anexar uma query string de versão ao carregar o asset no frontend.
