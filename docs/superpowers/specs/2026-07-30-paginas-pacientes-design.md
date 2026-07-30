# Revisão das páginas de pacientes

## Objetivo

Atualizar de forma incremental a lista de pacientes e o prontuário para o design system FisioFlow/Activity, tornando a operação clínica mais legível sem alterar as consultas, rotas, permissões, filtros disponíveis ou contratos de dados atuais.

## Escopo aprovado

O fluxo tem duas superfícies conectadas:

1. **Gestão de Pacientes**: localizar, filtrar, priorizar e abrir um paciente.
2. **Prontuário 360**: entender o contexto do paciente, agir rapidamente e navegar para os módulos clínicos especializados.

A fonte de referência visual é o handoff local em `design-system-handoff/fisioflow-design-system/project`, principalmente `ui_kits/web/paciente-detalhe.html`, `ui_kits/web/patient-list.jsx`, `colors_and_type.css` e seu `README.md`.

## Direção visual

- UI em português do Brasil, com Nunito, superfícies claras, bordas sutis e raio de 16 px.
- Azul Activity (`#0080FF`) somente em ações primárias, foco e estado ativo; neutros predominam.
- Cards são planos por padrão; sombras ficam reservadas a hover e popovers.
- Sidebar, cabeçalhos e controles seguem a densidade clínica do kit, sem gradientes decorativos, glassmorphism ou tratamentos premium.
- Ícones são `lucide-react`; controles somente com ícone terão rótulo acessível.

## Lista de pacientes

### Estrutura

`Patients.tsx` continua como orquestrador de dados, URL, paginação, modal de criação e exportação. A apresentação será organizada, nesta ordem:

1. título, subtítulo e ações de exportar/criar;
2. resumo operacional com totais existentes;
3. busca por nome, CPF ou telefone;
4. filtros rápidos e acesso aos filtros avançados;
5. chips dos critérios ativos, contador de resultados e ação de limpar;
6. lista de pacientes e paginação.

Os cards preservam a navegação para o perfil e tornam explícitos: identidade, condição/protocolo, sessões, situação e os indicadores que os dados atuais disponibilizarem. A reorganização não cria métricas nem inventa dados clínicos.

### Filtros

Todos os filtros existentes permanecem disponíveis: status, condição/patologia, classificação, status clínico, cirurgia, perfis de cuidado, esportes, focos terapêuticos, modelo de pagamento, status financeiro, origem e parceria.

- O estado continua serializado na URL por `usePatientsUrlState`, para compartilhamento, atualização e retorno previsíveis.
- Chips removem somente o critério que representam.
- “Limpar filtros” restaura os filtros rápidos e avançados, incluindo a busca.
- O botão de filtros avançados mostra sua contagem e abre um popover com cabeçalho, conteúdo rolável e ação de limpeza visível.
- Contagem e mensagem de resultado usam o `totalCount` da consulta filtrada.

### Estados

- Carregamento: skeletons com a mesma hierarquia da lista final.
- Vazio sem filtros: convite para cadastrar o primeiro paciente.
- Vazio com filtros: explica que não há resultado e oferece limpar filtros.
- Erro: manter o padrão atual de erro/retorno da aplicação, com tentativa segura quando já houver infraestrutura para isso.

## Prontuário do paciente

### Estrutura

O `PatientProfileHeader` mantém as ações existentes (voltar, editar, avaliação, agendamento, relatórios e IA), priorizando visualmente as ações clínicas recorrentes e deixando ações secundárias em um menu acessível quando necessário.

O topo reúne identidade, estado de tratamento e indicadores já existentes. A aba Visão Geral continua sendo a entrada do prontuário e prioriza linha do tempo, evolução/plano de cuidado e próximos compromissos, usando os componentes e dados já carregados. Não será criada uma segunda fonte de dados para o paciente.

As abas preservam seus valores, URLs e carregamento preguiçoso atuais. Quando a largura não comportar todos os rótulos, a navegação terá rolagem horizontal clara e acessível, em vez de esconder funcionalidades ou alterar deep links.

### Interação e estados

- A aba ativa permanece sincronizada ao parâmetro `tab` da URL.
- Ações conservam os modais, rotas e permissões existentes.
- Skeleton de perfil acompanha o cabeçalho, as abas e a grade final.
- Estados de ID inválido e paciente não encontrado continuam com rota de retorno para a lista.
- As animações ficam curtas (até 300 ms) e respeitam redução de movimento quando a infraestrutura disponível permitir.

## Limites

- Não alterar APIs, esquema de banco, regras de permissão, cálculos de indicadores ou a semântica dos filtros.
- Não remover filtros nem abas existentes.
- Não migrar toda a camada de componentes nem reescrever consultas como parte deste trabalho.
- Não modificar alterações locais do usuário fora dos arquivos necessários.

## Arquivos previstos

- `src/pages/Patients.tsx`
- `src/pages/patients/PatientProfilePage.tsx`
- `src/components/patient/PatientsPageHeader.tsx`
- `src/components/patient/PatientAdvancedFilters.tsx`
- `src/components/patient/PatientListItem.tsx`
- `src/components/patient/PatientProfileHeader.tsx`
- testes diretamente relacionados, se já existirem para esses componentes ou para o estado de URL.

## Verificação

1. Typecheck, lint e testes relevantes do app web passam.
2. Busca, cada filtro, remoção por chip e limpeza geral atualizam a URL e os resultados corretamente.
3. Paginação e exportação preservam o comportamento atual com e sem filtros ativos.
4. Um card abre o perfil correto; ações do perfil e abas mantêm os destinos atuais.
5. Estados de carregamento, vazio, ID inválido e paciente não encontrado continuam claros e utilizáveis.
6. A interface é responsiva e utilizável por teclado, com foco visível e controles nomeados.
