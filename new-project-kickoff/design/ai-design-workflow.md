# Esteira de design e layout conduzida por LLM

**Status:** aprovada como parte da reconstrução  
**Objetivo:** permitir que a IA conduza descoberta de UX, arquitetura de informação, design system, layouts, protótipos, implementação e validação, sem exigir que o proprietário desenhe telas manualmente.

## Ferramentas recomendadas

### 1. Figma MCP oficial — fonte de verdade

Usar o servidor remoto oficial `https://mcp.figma.com/mcp` e as skills oficiais do Figma quando a conexão for autorizada.

O fluxo deve permitir à LLM:

- criar e modificar conteúdo nativo no Figma;
- produzir frames, componentes, variantes, variáveis e Auto Layout;
- organizar bibliotecas e páginas por produto/domínio;
- ler contexto, medidas, estilos e componentes;
- gerar código a partir de frames selecionados;
- capturar a UI executada e devolvê-la ao Figma como camadas editáveis;
- usar Code Connect para mapear componentes do design aos componentes reais do repositório.

O Figma é a fonte visual final porque preserva estrutura editável, tokens, componentes, protótipos e handoff. A integração está em evolução e pode se tornar cobrada por uso; não assumir gratuidade permanente.

Referências: [documentação oficial do Figma MCP](https://developers.figma.com/docs/figma-mcp-server/) e [guia oficial](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server).

### 2. Google Stitch MCP — exploração visual

Usar o Stitch para gerar rapidamente direções visuais, telas alternativas e fluxos iniciais a partir do briefing. Seu resultado é matéria-prima de exploração, não a fonte de verdade do produto.

Fluxo recomendado:

1. gerar três direções visualmente distintas;
2. avaliar cada uma pela mesma rubrica;
3. consolidar a melhor no Figma;
4. descartar artefatos que não respeitem o domínio, acessibilidade ou design system.

Referência: [configuração oficial do Stitch via MCP](https://stitch.withgoogle.com/docs/mcp/setup).

### 3. Skills locais e implementação

- `frontend-design`: direção estética e implementação de interfaces com acabamento de produção;
- `vercel-react-best-practices`: qualidade e desempenho do web React;
- `vercel-react-native-skills`: qualidade, acessibilidade e desempenho dos apps Expo/React Native;
- MCP DevTools e Playwright: comportamento, responsividade, acessibilidade e regressão visual;
- gerador de imagens: ilustrações e assets originais quando realmente necessários.

Uma skill adicional de UI/UX só deve ser instalada após revisão de origem, licença, popularidade e instruções. A skill local `frontend-design` já cobre a implementação inicial; não há motivo para depender de conectores comunitários pouco usados.

### 4. Referências opcionais

Mobbin ou bibliotecas equivalentes podem ajudar a estudar padrões de produtos reais, desde que haja licença/conta apropriada. Servem para pesquisa de padrões, nunca para copiar telas, marca, textos ou assets.

## Responsabilidade da LLM

A LLM deve realizar o trabalho de ponta a ponta:

1. ler personas, jornadas, permissões, regras e restrições clínicas;
2. criar inventário de telas, arquitetura de informação e fluxos;
3. escrever o briefing visual e escolher uma direção estética coerente;
4. gerar e comparar alternativas no Stitch/Figma;
5. criar tokens, grid, tipografia, cores, ícones, componentes, estados e padrões de conteúdo;
6. desenhar telas desktop e iPhone, inclusive vazio, loading, erro, offline, sem permissão e conflito;
7. criar protótipos navegáveis dos fluxos críticos;
8. implementar componentes e páginas reais no repositório;
9. executar testes visuais, funcionais, responsivos e de acessibilidade;
10. capturar a UI real de volta no Figma e corrigir divergências;
11. manter documentação e design system sincronizados.

O proprietário não precisa operar Figma nem desenhar componentes. Sua participação pode se limitar a aprovar a direção apresentada e decisões de negócio que a LLM não deve inventar.

## Processo por feature

### A. Contrato de experiência

Antes do layout, registrar:

- persona e objetivo;
- início e término da tarefa;
- dados e permissões necessários;
- estados felizes, vazios, erros, offline, bloqueios e recuperação;
- risco clínico, financeiro ou de privacidade;
- métrica de sucesso;
- superfícies necessárias: web, profissional e/ou paciente.

### B. Exploração

- produzir três conceitos distintos, não apenas variações de cor;
- usar apenas dados sintéticos;
- comparar clareza, velocidade, acessibilidade, densidade, originalidade, confiança e viabilidade técnica;
- selecionar uma direção e registrar o motivo.

### C. Sistema visual

- tokens semânticos compartilhados entre web e mobile;
- componentes com estados, tamanhos, variantes, focus, teclado e leitor de tela;
- densidade adequada ao desktop operacional e ergonomia adequada ao iPhone;
- modo claro/escuro somente se houver decisão explícita, sem duplicar esforço automaticamente;
- linguagem visual própria, evitando aparência genérica de dashboard produzido por IA.

### D. Implementação e round-trip

1. mapear componentes Figma para componentes do código;
2. implementar com contratos reais e fixtures sintéticos;
3. validar no navegador/dispositivo;
4. comparar captura e design;
5. enviar a UI real ao Figma quando útil;
6. atualizar tokens/componentes e repetir até os gates passarem.

## Organização do arquivo Figma

- `00 Foundations`: marca, tokens, grids, tipografia e acessibilidade;
- `01 Components`: componentes e variantes;
- `10 Web Platform`: shell e módulos completos;
- `20 Professional iPhone`: jornadas profissionais;
- `30 Patient iPhone`: jornadas do paciente;
- `40 Prototypes`: fluxos críticos navegáveis;
- `90 Archive`: conceitos descartados e decisões, sem dados reais.

## Entregáveis mínimos

- briefing visual e princípios de UX;
- mapa de navegação e inventário de telas;
- design tokens versionados;
- biblioteca de componentes e estados;
- layouts e protótipos dos fluxos críticos;
- links/nós Figma rastreáveis a specs e issues;
- componentes implementados e mapeados;
- testes de acessibilidade e regressão visual;
- registro das decisões e divergências aceitas.

## Segurança e privacidade

- nunca enviar PII/PHI, prontuário, áudio, vídeo ou documento real ao Stitch, Figma ou serviços de referência;
- usar nomes, fotos, datas, documentos e métricas totalmente sintéticos;
- não colocar secrets ou URLs assinadas em frames, prompts ou plugins;
- revisar escopos OAuth e preferir MCPs oficiais;
- conectores comunitários não recebem acesso ao repositório ou arquivos de design sem revisão explícita;
- ações de escrita externa exigem autorização e devem ser limitadas ao projeto de design correto.

## Gates

- todos os fluxos críticos têm estados de erro, vazio, permissão e recuperação;
- contraste, teclado, leitor de tela, tamanho de toque e motion reduzido passam;
- nenhuma informação clínica aparece para persona não autorizada;
- desktop funciona nas larguras-alvo e apps respeitam safe areas e Dynamic Type;
- componentes reutilizam tokens e não introduzem estilos avulsos;
- implementação e Figma não divergem silenciosamente;
- nenhum conteúdo ou layout de terceiro é copiado.

## Momento de configuração

Não conectar Stitch ou Figma ao sistema legado. Configurar os MCPs no **novo repositório**, após a criação do workspace de design e autorização do proprietário. Até lá, este documento define o processo e os critérios.
