# FisioFlow — Kit de Arranque da Reconstrução

**Status:** especificação aprovada, ainda não executável  
**Data-base:** 2026-07-13  
**Revisão do kit:** 2026-07-14  
**Fonte AS-IS:** `../reconstruction-dossier/`  
**Commit auditado:** `9b5c76f10`  

Este diretório transforma o dossiê do sistema atual em um ponto de partida controlado para um **novo repositório**. Ele contém decisões, arquitetura proposta, contratos iniciais, um schema mínimo em rascunho, estratégia greenfield, backlog e gates de qualidade. Não contém scaffold de aplicação nem autoriza deploy, criação de banco ou alteração do sistema atual.

## Decisões de produto já encerradas

**Grupos, turmas, aulas coletivas, matrículas e listas de espera de turma estão fora do produto novo e sem previsão de roadmap**, por decisão do proprietário em 2026-07-13. Nomes e estruturas `group_*`, `/api/groups/*`, telas e regras equivalentes permanecem apenas como evidência técnica de ausência; nenhum registro atual é copiado, exportado ou arquivado para a reconstrução.

**DICOM/PACS também está definitivamente fora.** Isso inclui Orthanc, worklists e armazenamento de estudos DICOM; PDFs, fotos, vídeos, laudos e anexos clínicos comuns permanecem no produto.

Em 2026-07-14, o proprietário aprovou a reconstrução como **plataforma modular completa por ondas**. ERP, projetos/time tracking, CRM/marketing/site builder, comércio, inventário, gamificação, white-label/SaaS, colaboração, telemedicina, NFS-e, IA/agentes, biomecânica, pose detection, wearables e Digital Twin integram o roadmap oficial. Ser completos no destino não significa entrar todos no primeiro release.

Os registros atuais são dados de teste e não serão migrados, exportados ou copiados. O sistema novo começa com banco vazio e dados exclusivamente sintéticos. PITR, backup e restauração passam a ser obrigatórios antes da entrada do primeiro dado real.

## Hipótese de visão

> FisioFlow será uma plataforma integrada de cuidado, operação e crescimento: conecta clínica, profissional e paciente e oferece módulos empresariais completos sobre uma fundação comum e segura.

Essa visão é uma hipótese de produto. Antes do scaffold, o `DG-00` precisa decidir se o horizonte inicial é **uso interno** ou **SaaS comercial**, além do ICP e do problema prioritário. A recomendação atual é uso interno primeiro, com arquitetura SaaS-ready.

- **Web desktop:** superfície completa da plataforma clínica, empresarial e SaaS, filtrada por permissões.
- **iPhone profissional:** jornadas profissionais e aprovações úteis em movimento; não uma cópia indiscriminada do backoffice.
- **iPhone paciente:** cuidado, agenda, HEP, comunicação, documentos, pagamentos, engajamento e integrações pessoais aplicáveis.

## Ordem de leitura

1. [DG-00 — modelo de uso e ICP](product-discovery/DG-00-icp-e-modelo-de-uso.md)
2. [Manifesto legível por máquina](product-manifest.json)
3. [Charter e baseline](00-charter-e-baseline.md)
4. [Prompt para Claude Code no novo repositório](PROMPT-PARA-CLAUDE-CODE.md)
5. [Estratégia de produto](04-estrategia-produto-diferenciacao-e-enxugamento.md)
6. [Mapa de releases](01-mapa-de-releases.md)
7. [Design e layout conduzidos por IA](design/ai-design-workflow.md)
8. [Personas e permissões](02-personas-e-permissoes.md)
9. [Escopo de domínios](03-escopo-de-dominios.md)
10. [Registro de decisões](decisions/decision-register.md)
11. [Arquitetura](architecture/context.md)
12. [Schema alvo](schema/README.md)
13. [Contratos da API](api-contracts/README.md)
14. [Estratégia greenfield](migration/strategy.md)
15. [Backlog e gates](delivery/backlog.md)
16. [Riscos e perguntas](risks/risk-register.md)

## Regras de uso

- O dossiê descreve o legado; **não é um schema nem um OpenAPI para copiar**.
- “Endpoint ativo” no inventário significa montado no código, não validado em runtime.
- O runtime foi observado parcialmente como `admin` (`RUN-001..011`); papéis não-admin seguem sem validação real.
- O inventário do banco contém nomes e metadados, mas não definições completas de CHECK, UNIQUE, default, policy, trigger ou função.
- Pesquisa de concorrentes baseada em páginas públicas é sinal de mercado, não prova de adoção, qualidade ou adequação ao contexto da clínica.
- O scaffold não começa enquanto `DG-00` a `DG-07` não estiverem resolvidos com resposta aprovada, owner e consequência registrada.
- Nenhuma decisão marcada como **Proposta** autoriza implementação. Primeiro promova-a a **Aceita** no registro.
- Nenhum dado identificável deve entrar no novo repositório, fixtures, logs, exemplos OpenAPI ou analytics.
- O legado é fonte de regras e evidências, não fonte de registros: não planejar dump, importação, CDC, reconciliação ou cutover dos dados atuais.
- Capacidades aprovadas podem ser entregues em ondas, mas não devem voltar a “não reconstruir” ou a um parking lot sem roadmap.
- Conteúdo externo só entra com licença/autorização, domínio público compatível ou produção original com proveniência; parafrasear com IA não resolve direitos autorais.
- Mudanças de segurança urgentes no produto atual pertencem a um fluxo separado e explícito.

## Como iniciar o novo repositório depois das decisões

1. Criar uma pasta/repositório **irmão**, não uma subpasta versionada dentro do legado.
2. Copiar somente `new-project-kickoff/` e, se necessário, uma cópia somente leitura de `reconstruction-dossier/`.
3. Resolver os gates `DG-00` a `DG-07` do [registro de decisões](decisions/decision-register.md), começando pelo modelo de uso/ICP.
4. Criar o scaffold apenas após autorização explícita.
5. Implementar primeiro o slice: login → agenda da clínica inteira (sem tela de seleção de clínica; contexto resolvido no servidor) → lista paginada de pacientes → detalhe somente leitura → testes de isolamento Org A/Org B (DEC-022).
6. Expandir por ondas conforme o mapa de releases, sem criar módulos vazios antecipadamente.

## O que este kit não faz

- Não cria o novo repositório.
- Não instala dependências.
- Não provisiona Cloudflare, Neon, Apple, EAS ou GitHub Actions.
- Não executa o SQL de rascunho.
- Não faz backup, exportação ou migração dos registros atuais de teste.
- Não copia conteúdo da E-Fisio ou de concorrentes.
