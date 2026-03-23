# DICOM Optimization Roadmap

## Context
- **PACS (Picture Archiving and Communication System)** centraliza imagens médicas, armazenamento e acesso remoto, eliminando passos manuais e acelerando diagnóstico com menor erro humano. [definitivehc PACS glossary]
- **Bibliotecas web**: Cornerstone continua sendo o padrão (dobrando em dcmjs, dicomParser e alternativas como DICOM Web Viewer) para visualização clínica; alternativas leves como DWV e os projetos listados em `awesome-dicom` podem servir para protótipos ou testes.

## Step 1 — Codec audit & decoder hygiene
1. Use `cornerstone-vendor`/`dicom-image-loader` para gerar um inventário dos arquivos wasm/js incluídos hoje (charls, openjpeg, libjpegturbo, etc.).
2. Verificar na produção quais patient flows realmente usam transfer syntaxes sofisticadas e documentar os casos de uso dependentes.
3. Planejar remoções ou configurações (ex.: limitar `dicomImageLoader.init` a um subset de decoders ou carregar decoders via `import()` apenas quando necessário).

## Step 2 — CSS por domínio
1. Catalogar os blocos restantes em `src/index.css` e dividir em arquivos específicos (agenda, diálogo, DICOM, mobile), importando-os apenas nos componentes/rotas que usam cada estilo.
2. Opcional: acompanhar via build stats (`ANALYZE=true pnpm build`) para provar que o chunk CSS principal cai.

## Step 3 — Viewer isolation
1. Definir uma rota/layout dedicados para o viewer DICOM/Clinical Analysis, carregando `cornerstone-vendor` e codecs só quando o usuário entrar nessa rota.
2. Garantir que qualquer outro lugar que gere `ImageAnalysisDashboard` use `Suspense` + `lazy` para puxar o viewer somente sob demanda.
3. Atualizar os cards/CTA da home/dashboard para apontar para essa nova rota, deixando o shell principal limpo.

## References
- `https://www.definitivehc.com/resources/glossary/PACS` for PACS definition (turn0search8).
- Web-based DICOM viewer comparisons & Cornerstone docs (turn1search11 + turn0search7).
- Awesome DICOM list for alternative libraries (turn1search11). 
