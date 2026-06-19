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

## 📐 Regras de Layout e CSS

* O design é construído com Tailwind CSS. Os cards de exercícios devem manter estritamente a proporção `aspect-video` (16:9) nas imagens para evitar cortes e distorções anatômicas.
* O grid principal deve seguir a estrutura responsiva padrão para evitar quebras em telas móveis e desktop.
