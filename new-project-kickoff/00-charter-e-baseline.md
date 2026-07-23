# 00 — Charter e baseline

## Objetivo

Reconstruir o FisioFlow como uma **plataforma modular completa para clínicas e profissionais de fisioterapia**, com núcleo clínico seguro e uma suíte ampla de operação, gestão, relacionamento, crescimento, colaboração e inteligência. O produto deve reduzir o esforço para registrar o atendimento, aumentar a continuidade do tratamento entre consultas e permitir que a clínica concentre sua operação em uma única plataforma, sem substituir julgamento clínico.

Amplitude é uma decisão de portfólio, não uma autorização para lançar tudo de uma vez. Os módulos entram por ondas, com contratos estáveis, feature flags, permissões próprias, métricas, responsáveis e critérios de entrada e saída.

## Problema que o produto resolve

Hoje a informação está distribuída entre agenda, prontuário, exercícios, WhatsApp, financeiro, projetos, estoque, marketing e múltiplos painéis. O produto novo organiza o cuidado em torno de um **episódio de recuperação** com objetivo, plano, sessões, medidas, exercícios domiciliares, comunicação e desfecho, enquanto oferece módulos completos para administrar e expandir a clínica.

O episódio de recuperação continua sendo o eixo clínico. ERP, CRM, marketing, projetos, inventários, gamificação e IA se conectam a ele por contratos explícitos, mas preservam fronteiras próprias e podem ser ativados de forma independente.

## Modelo de uso e ICP

O momento de comercialização ainda depende do gate [DG-00](product-discovery/DG-00-icp-e-modelo-de-uso.md), mas o horizonte aprovado inclui **SaaS, onboarding de clínicas, billing da assinatura e white-label**. A recomendação continua sendo validar primeiro na operação interna, com arquitetura SaaS-ready, e ativar a onda comercial quando ICP, suporte, preço e operação multi-cliente estiverem definidos.

Multi-tenancy é obrigatório desde a fundação. A decisão de começar internamente não autoriza atalhos de tenant, identidade ou segurança e não remove SaaS/white-label do roadmap oficial.

## Produtos no horizonte aprovado

| Produto | Usuário primário | Papel |
|---|---|---|
| Web para computador | clinic admin, clinical lead, recepção, profissionais, financeiro, marketing, projetos e operação | superfície completa da plataforma, conforme módulos contratados e permissões |
| App iPhone profissional | fisioterapeuta, estagiário supervisionado e equipe em mobilidade | companheiro clínico e operacional focado no trabalho do dia |
| App iPhone paciente | paciente e cuidador autorizado | plano de cuidado, HEP, agenda, comunicação, pagamentos, documentos e engajamento |

Os aplicativos não são cópias do desktop. Cada capacidade entra no app somente quando fizer sentido para a persona, o contexto móvel, a privacidade e a operação; a administração completa permanece no web.

## Portfólio modular aprovado

- núcleo clínico, agenda individual, prontuário, avaliações, evolução, resultados, HEP, documentos e retorno médico;
- ERP financeiro e fiscal completo, incluindo estoque físico, compras, fornecedores, convênios quando aplicáveis e NFS-e;
- CRM omnichannel, marketing completo, campanhas, automações, conteúdo e website builder;
- gestão de projetos, Kanban, dependências, recorrência, time tracking e integrações de produtividade;
- gamificação completa, com XP, desafios, conquistas, streaks, moedas, loja, inventário virtual e leaderboard;
- SaaS, administração multi-cliente e white-label;
- colaboração simultânea, telemedicina e experiências móveis/offline adequadas à persona;
- IA assistiva, busca de evidência, base de conhecimento e agentes especializados com autonomia governada;
- biomecânica, pose detection, visão computacional, wearables/HealthKit e Digital Twin, condicionados a gates clínicos e experimentais;
- analytics clínico, operacional, financeiro e comercial, inclusive coortes e benchmarks com proteção contra reidentificação.

## Não objetivos

- Implementar grupos, turmas, aulas coletivas, matrículas ou waitlist de turma.
- Implementar DICOM, PACS, Orthanc ou fluxo equivalente de estudos de imagem médica.
- Migrar ou preservar os dados atuais do legado: eles são dados de desenvolvimento/teste e foram declarados descartáveis pelo proprietário em 2026-07-14.
- Reproduzir cegamente as 224 rotas, 1.191 endpoints, 303 tabelas, duplicidades, órfãos, mocks ou falhas de segurança do legado.
- Permitir diagnóstico, prescrição, alta ou alteração automática de conduta por IA.
- Copiar ou apenas parafrasear conteúdo da E-Fisio, concorrentes ou bibliotecas sem licença; conteúdo clínico deve ser original ou licenciado, com proveniência e revisão.
- Construir os apps como espelhos integrais do web desktop.
- Colocar todos os módulos no primeiro release ou acoplá-los num único deploy inseparável.

## Princípios

1. **Plataforma completa por ondas:** o portfólio é amplo, mas cada onda entrega capacidades demonstráveis e operáveis.
2. **Jornada antes de menu:** cada tela serve a uma tarefa real, mesmo em módulos administrativos completos.
3. **Modularidade real:** módulos possuem dados, contratos, permissões, eventos, métricas e ciclo de ativação próprios.
4. **Deny by default:** autorização server-side e RLS real, testados com role não-owner.
5. **Humano responsável:** IA produz rascunho, sugestão ou ação operacional governada; decisão clínica continua humana.
6. **Dados mínimos:** coletar, reter e expor somente o necessário para a finalidade declarada.
7. **Ação antes de dashboard:** alertas e indicadores apontam decisão, responsável ou próxima tarefa.
8. **Offline seletivo:** somente jornadas que realmente precisam; operações irreversíveis permanecem online.
9. **Um vocabulário:** um modelo canônico, sem pares PT/EN ou trilhos concorrentes para a mesma capacidade.
10. **Evolução incremental:** monólito modular primeiro; extração somente com pressão comprovada.
11. **Portabilidade consciente:** Cloudflare + Neon como baseline, com contratos e dados não presos a um único runtime.
12. **Sem paridade cega:** a lógica útil é reconstruída; bugs, mocks, dados fictícios e dívida não são requisitos.
13. **Conteúdo com proveniência:** material educacional e clínico é original ou licenciado, versionado, citado e revisado.

## Baseline auditado

- Código-fonte: commit `9b5c76f10`.
- Dossiê: cerca de 50 artefatos de inventário e análise em `../reconstruction-dossier/`.
- Banco legado: 303 tabelas, 3.942 colunas e 5.838 objetos inventariados como evidência estrutural.
- Runtime: observação parcial somente como admin, complementada após a auditoria estática.
- Working tree: a correção do `SurgeriesCard` observada em runtime não integra o commit-base; tratá-la como evidência posterior, não como conteúdo auditado no commit.
- Escala observada: 1 organização, 986 pacientes, 13.941 agendamentos e 11.054 sessões.
- Decisão de dados: os registros atuais são de teste, não serão migrados nem receberão backup para a reconstrução. O sistema novo nasce vazio, com seeds e fixtures sintéticos.

As contagens do legado servem para descobrir regras, superfícies e complexidade, não para definir um plano de migração. Backups, PITR, retenção e testes de restauração passam a ser obrigatórios quando o sistema novo começar a armazenar dados reais.

## Limites de confiança

| Sinal | Interpretação correta |
|---|---|
| Montado/ativo no inventário de APIs | rota registrada no código; pode não ter sido usada |
| Implementado | código/estrutura existe; não implica uso ou correção |
| Confirmado em produção | houve evidência de runtime ou dado agregado no ambiente auditado; não transforma os dados em fonte de migração |
| Planejado/parcial/mock | informa descoberta e risco; precisa de novo desenho e aceite antes de entrar numa onda |
| Regra de negócio | hipótese derivada do legado; deve ser validada com proprietário/usuário |

## Métrica norte proposta

**Entre episódios com baseline e follow-up comparáveis válidos, percentual que alcança melhora clinicamente relevante no instrumento validado para aquela jornada.**

- numerador: episódios com baseline e follow-up válidos que atingem o limiar clínico aprovado;
- denominador: episódios com baseline e follow-up comparáveis válidos na janela definida;
- instrumento, janela, população elegível e limiar precisam ser definidos pelo responsável clínico;
- não agregar condições incomparáveis numa única taxa sem validação metodológica.

**Cobertura de follow-up e abandono não fazem parte da mesma fórmula.** São métricas de equilíbrio obrigatórias e devem aparecer ao lado da métrica norte, para impedir seleção apenas dos casos medidos ou ocultação de perda de pacientes.

Métricas de equilíbrio e operação:

- tempo mediano para concluir uma evolução;
- cobertura de medida inicial e follow-up;
- adesão ao HEP;
- taxa de faltas e abandono não planejado;
- precisão/aceitação dos sinais do Radar, descartes e tempo até ação;
- correções exigidas em rascunhos de IA e ações de agentes revertidas;
- uso semanal e conclusão das jornadas principais nos dois apps;
- fechamento financeiro, acurácia de estoque e tempo de execução de processos;
- conversão e opt-out de campanhas, respeitando consentimento;
- adoção por módulo, custo por organização e tempo até primeiro valor;
- incidentes de autorização, privacidade, sincronização ou automação.

Cada módulo completo deve ter sua própria métrica de resultado, qualidade e custo. Alvos operacionais só serão definidos após 4–8 semanas de baseline confiável no sistema novo. Métricas clínicas respeitam a janela do episódio e do instrumento, mesmo quando exceder oito semanas.

## Condição para começar código

O scaffold pode começar quando os gates de fundação aplicáveis estiverem decididos, o primeiro slice tiver critérios de aceite e os responsáveis por produto, segurança clínica e dados estiverem identificados. Questões específicas de módulos avançados não bloqueiam a fundação: elas se tornam gates obrigatórios antes da onda correspondente.
