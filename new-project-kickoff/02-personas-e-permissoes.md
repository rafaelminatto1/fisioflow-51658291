# 02 — Personas e permissões

## Modelo conceitual

- **Identidade**: pessoa autenticada por um emissor único.
- **Membership**: vínculo da identidade com uma organização e seu estado (`pending`, `active`, `suspended`, `revoked`).
- **Role**: agrupamento versionado de permissões, nunca fonte única de autorização.
- **Permission**: ação concreta (`patient.read`, `journal.post`, `campaign.publish`).
- **Patient subject**: vínculo separado que permite ao paciente acessar somente os próprios dados.
- **Platform actor**: operador do SaaS com capability global estreita; não é membership de clínica e não recebe acesso clínico implícito.
- **Service identity**: identidade não humana por domínio/job, com grants, expiração e auditoria próprios.

`pending` é estado de membership, não papel. Um token válido sem membership ativa não recebe role `viewer`, organização default nem acesso parcial. Entitlement habilita um módulo contratado; permission autoriza uma ação dentro dele. Um nunca substitui o outro.

## Personas clínicas e de atendimento

| Persona/role | Superfície principal | Necessidade e limite |
|---|---|---|
| Clinic admin/proprietário (`clinic_admin`) | web | configurar clínica, pessoas e operação; propriedade não concede prontuário nem lançamento contábil final |
| Clinical lead (`clinical_lead`) | web + app profissional quando também atende | governança clínica, supervisão, templates, revisão e acesso clínico justificado |
| Recepção (`reception`) | web | agenda, cadastro mínimo, comunicação e cobrança operacional sem prontuário clínico |
| Fisioterapeuta (`physiotherapist`) | web + app profissional | contexto clínico, atendimento, evolução, medidas e HEP conforme vínculo |
| Estagiário supervisionado (`intern`) | web + app profissional | rascunhar e enviar para revisão; não finalizar quando a política exigir supervisão |
| Paciente (`patient_subject`) | app paciente + links restritos | dados próprios liberados, plano, HEP, progresso, agenda, pagamento e solicitações |
| Cuidador delegado | app paciente | ações explicitamente delegadas por paciente/base legal, com escopo, validade e revogação |

## Personas administrativas por módulo

| Persona/role | Responsabilidade | Não concede |
|---|---|---|
| Finance manager (`finance_manager`) | contas a pagar/receber, cobrança, caixa, orçamento, conciliação e aprovação dentro de alçada | prontuário; parametrização contábil irrestrita; aprovação da própria transação |
| Contabilidade/fiscal (`accountant`) | plano de contas, período, lançamento/estorno, fechamento, fiscal, NFS-e e relatórios | acesso clínico; recebimento/guarda de caixa; alteração silenciosa de lançamento contabilizado |
| Marketing manager (`marketing_manager`) | segmentos autorizados, campanhas, calendário, site, marca, publicação e métricas | prontuário, diagnóstico, lista sem base legal ou supressão de opt-out |
| Project manager (`project_manager`) | portfólio, projetos, boards, dependências, recursos, aprovações e relatórios de tempo | prontuário embutido em tarefa; aprovação automática do próprio timesheet quando houver segregação |
| Estoque/compras (`inventory_manager`) | fornecedores, pedidos, recebimento, lotes, reservas, ajustes e inventário físico | financeiro contábil final; inventário virtual da gamificação; prontuário |
| Comercial (`commercial_manager`) | leads, oportunidades, propostas, pedidos, contratos comerciais e previsão | dados clínicos, campanhas sem consentimento ou lançamento contábil final |
| Curadoria de conhecimento (`knowledge_editor`) | taxonomia, fontes, licenças, artigos, revisões, citações e propostas geradas por IA | publicação clínica sem revisor qualificado; mudança automática de conduta |

Uma identidade pode acumular roles, mas as permissões são a união explícita de grants compatíveis e continuam sujeitas a segregação de funções. Por exemplo, `finance_manager` + `accountant` não autoriza criar e aprovar o mesmo pagamento ou lançar e conciliar a própria operação sem uma exceção auditada.

## Personas da plataforma SaaS

| Persona/capability | Responsabilidade | Limite obrigatório |
|---|---|---|
| Platform admin (`platform_admin`) | catálogo de planos/módulos, provisioning, subscription, metering, políticas de SLO e incidentes da plataforma | sem consulta a PHI/PII tenant-owned; não usa role owner do banco clínico |
| Platform support (`platform_support`) | tickets, diagnóstico por telemetria sanitizada, comunicação, SLA e solicitação de acesso temporário | sem impersonation silenciosa; acesso excepcional requer caso, aprovação, prazo e banner |
| Platform billing (`platform_billing`) | cobrança da assinatura SaaS, invoices e reconciliação do provedor | separado do ERP da clínica e sem dados clínicos |
| Sistema/integração | jobs e integrações por domínio | credencial própria, escopo mínimo, rotação e nenhum owner compartilhado |

`platform_admin` não é superadmin clínico. Provisionar uma organização cria o tenant e seus grants iniciais por workflow auditado, mas não cria acesso permanente do operador aos dados daquela organização.

## Matriz clínica inicial

Legenda: `R` ler, `W` criar/editar, `F` finalizar/autorizar, `—` sem acesso. A API verifica permissions em cada operação; esconder menu não é autorização.

| Capacidade | Clinic admin | Clinical lead | Recepção | Fisio | Estagiário | Paciente |
|---|---:|---:|---:|---:|---:|---:|
| Organização/configurações | R/W/F | R/W clínico limitado | R limitado | R limitado | — | — |
| Usuários/memberships | R/W/F | R equipe clínica quando delegado | — | — | — | — |
| Agenda | R/W/F | R/W | R/W | R/W próprio | R próprio | R/W solicitações próprias |
| Cadastro administrativo do paciente | R/W | R/W | R/W | R/W campos necessários | R | R/W campos próprios permitidos |
| Prontuário clínico | — por padrão | R/W/F | R demográfico; — clínico | R/W/F conforme vínculo | R/W rascunho | R próprio conforme liberação |
| Evolução | — | R/W/F/revisão | — | R/W/F | R/W; revisão conforme política | R própria liberada |
| HEP | — | R/W/F | — | R/W/F | R/W rascunho | R/execução própria |
| Comunicação assistencial | — administrativo | R atribuído | R/W operacional | R atribuído | R atribuído quando delegado | solicitações próprias |
| Cobrança operacional | R | — por padrão | R/W limitada | — por padrão | — | R/pagar próprios |
| Relatórios | R operacional autorizado | R clínico | R operacional | R clínico conforme vínculo | R próprio | R progresso próprio |
| Auditoria/LGPD | R/F administrativo | R/F clínico | — | export próprio quando permitido | — | consentir/exportar/solicitar próprios |

## Matriz administrativa resumida

| Capacidade | Clinic admin | Finance manager | Accountant | Marketing | Projects | Estoque/compras | Comercial | Knowledge editor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Configurar módulo/equipe | F | R limitado | R limitado | R limitado | R limitado | R limitado | R limitado | R limitado |
| Financeiro operacional | R | R/W/F por alçada | R | — | — | R custo próprio | R pedido próprio | — |
| Ledger/fechamento/fiscal | — | preparar | R/W/F segregado | — | — | — | — | — |
| CRM e oportunidades | R | — | — | R segmentação | — | — | R/W/F | — |
| Campanha/site/publicação | R aprovação de marca | — | — | R/W/F | — | — | R insumo | R conteúdo delegado |
| Projetos/time tracking | R | — | — | W próprio | R/W/F | W próprio | W próprio | W próprio |
| Compras/estoque físico | R | R orçamento/pagamento | R fiscal | — | — | R/W/F | R catálogo autorizado | — |
| Conhecimento/evidência | R publicado | — | — | R conteúdo aprovado | — | — | R público | R/W; publicar só com revisão adequada |

## Segregação de funções obrigatória

| Fluxo | Quem prepara | Quem aprova/finaliza | Restrição |
|---|---|---|---|
| Pagamento/transferência acima da alçada | finance manager | aprovador financeiro distinto | criador não aprova a própria operação |
| Lançamento contábil e fechamento | accountant | accountant/revisor distinto conforme política | lançamento postado só muda por estorno |
| Pedido de compra | inventory manager | alçada de compras/financeiro | recebimento, aprovação e pagamento são eventos distintos |
| Campanha/publicação | marketing/knowledge editor | responsável de marca ou clínico conforme conteúdo | opt-out e revisão clínica não podem ser ignorados |
| Timesheet | colaborador | project manager distinto | ajuste posterior mantém histórico |
| Conteúdo clínico | knowledge editor ou IA | clinical lead/revisor qualificado | IA nunca publica nem assina sozinha |
| Provisioning/entitlement SaaS | platform admin/service workflow | policy + segundo aprovador em mudanças críticas | não concede acesso clínico ao operador |
| Acesso de suporte | platform support | responsável autorizado + paciente/tenant quando aplicável | purpose, ticket, TTL, banner e auditoria reforçada |

## Regras obrigatórias

1. `organization_id` vem do contexto autenticado, nunca do body como autoridade.
2. O paciente nunca escolhe `patient_id`; ele vem do vínculo autenticado.
3. Toda mutação clínica registra ator, papel efetivo, organização, timestamp e origem.
4. Uma permission nova nasce negada para todos até inclusão explícita.
5. Alteração de role, membership ou entitlement revoga cache/sessões dentro do SLA definido.
6. Jobs usam service identities por domínio e nunca uma credencial owner compartilhada.
7. Support impersonation exige ticket, aprovação, finalidade, duração, banner permanente durante a sessão e auditoria reforçada.
8. `clinic_admin` não recebe `patient.clinical.read`; acesso excepcional exige role clínica explícita, finalidade e auditoria.
9. Recepção e roles administrativas acessam somente DTOs mínimos para seu caso de uso.
10. `platform_admin`, `platform_support` e `platform_billing` não são membros automáticos de tenants.
11. Billing SaaS e ERP da clínica têm ledgers, permissões e responsáveis separados.
12. Marketing, site e CRM usam consentimento/finalidade próprios; consentimento assistencial não autoriza campanha.
13. Knowledge/content armazena fonte, autoria, licença, citação, revisão e estado editorial; conteúdo clínico exige revisor qualificado.
14. LLM pode propor texto, taxonomia, layout ou design, mas a proposta guarda modelo/prompt/version/diff e não é publicada sem aprovação humana apropriada.
15. Grupos/turmas e DICOM/PACS não recebem roles, permissions, entidades ou exceções.

## Testes mínimos por endpoint

- sem autenticação → 401;
- autenticado sem membership/capability de plataforma ativa → 403;
- módulo sem entitlement → 404/403 conforme contrato, sem sugerir acesso adquirido;
- role sem permission → 403;
- Org A tentando ID de Org B → 404 sem revelar existência;
- paciente A tentando paciente B → 404;
- clinic admin ou role administrativa tentando prontuário → 403;
- platform admin tentando endpoint clínico sem grant temporário aprovado → 403;
- criador tentando aprovar a própria operação segregada → 403/409 auditado;
- conteúdo gerado por LLM tentando publicar sem revisão → 403/409;
- payload tentando trocar `organizationId` → ignorado/rejeitado;
- alteração de role/entitlement deve valer dentro do SLA de revogação definido;
- encerramento do ticket/TTL revoga imediatamente qualquer acesso temporário de suporte.

A matriz executável inicial está em [schema/application-authorization-matrix.csv](schema/application-authorization-matrix.csv). Ela é baseline de testes, não substitui o catálogo versionado de permissions.
