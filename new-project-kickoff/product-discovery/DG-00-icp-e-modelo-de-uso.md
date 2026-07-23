# DG-00 — Modelo de uso e ICP inicial

**Status:** ✅ Resolvido em 2026-07-14 — **uso interno, clínica única, sem SaaS comercial** (arquitetura permanece SaaS-ready por segurança/isolamento, sem funcionalidades SaaS no roadmap). Owner: proprietário.  
**Owner da decisão:** proprietário + produto  
**Revisar com:** responsável clínico + operação + engenharia

## Resolução (2026-07-14)

O proprietário decidiu que o desenvolvimento é **exclusivamente para a própria clínica**, sem planos de revenda/SaaS. Consequências aplicadas ao kit:

- **Modelo:** `uso_interno` — uma única organização. Não é `uso_interno_primeiro` como passo para SaaS; é uso interno como destino atual.
- **Mantido (barato, é segurança):** isolamento por `organization_id` + RLS real + modelo canônico. A arquitetura continua "multi-organização por baixo" para não vazar dados entre contextos e para não travar uma eventual mudança futura de decisão — sem custo de produto hoje.
- **Removido do roadmap próximo:** billing/assinatura SaaS, self-service de cadastro de clínicas, white-label, marketplace comercial, painel de revenda, onboarding repetível de clientes externos, documentação pública de vendas. Não criar entidade, rota, flag ou placeholder para nada disso (mesma regra dos itens `group_*`/DICOM).
- **Se a decisão mudar no futuro:** reabrir este gate e promover os módulos SaaS por ondas; a fundação técnica já suporta.

Campos de discovery ainda a levantar com observação real (não inventar métricas): ICP é N/A (clínica única conhecida); dores prioritárias, baseline (tempo de evolução, faltas, abandono, uso de HEP, retrabalho) e alternativa atual devem ser preenchidos por observação/entrevista antes da primeira ativação com dado real — isso não bloqueia a direção de arquitetura, que já está decidida.

## Por que esta decisão vem antes da arquitetura executável

Ainda não está definido se, nos próximos 12 meses, o FisioFlow será:

1. um sistema reconstruído primeiro para a clínica atual; ou
2. um produto SaaS comercial para outras clínicas desde o primeiro lançamento.

As duas opções podem compartilhar segurança multi-tenant, contratos e portabilidade, mas exigem prioridades diferentes. SaaS acrescenta onboarding repetível, cobrança da assinatura, suporte externo, administração de tenants, política comercial, documentação pública e custos operacionais que não devem entrar por antecipação.

## Recomendação inicial

Adotar **uso interno primeiro, com arquitetura SaaS-ready**, até haver evidência de demanda externa. Essa decisão ordena as ondas; não remove SaaS, billing, white-label, marketplace ou qualquer outro módulo aprovado do destino do produto.

- construir para os fluxos medidos da clínica atual;
- manter isolamento por organização e modelo canônico desde o início;
- modelar tenancy, catálogo de módulos e fronteiras desde a fundação, implementando billing SaaS, self-service, white-label e marketplace nas ondas aprovadas;
- validar externamente o produto antes de transformar capacidade técnica em operação SaaS.

Essa recomendação não decide o gate. O proprietário precisa registrar a escolha abaixo.

## Registro obrigatório da decisão

| Campo | Resposta a preencher |
|---|---|
| Modelo nos próximos 12 meses | `uso_interno_primeiro` ou `saas_desde_o_inicio` |
| Organização/clínica inicial | nome lógico, sem dados pessoais |
| ICP inicial | tipo de clínica, tamanho, número de unidades, especialidades e modelo particular/convênio |
| Comprador/decisor | quem aprova custo e mudança de sistema |
| Usuários diários | clinic admin, clinical lead, recepção, fisioterapeuta, estagiário e paciente aplicáveis |
| Alternativa atual | sistema/planilha/WhatsApp que será substituído ou complementado |
| Três dores prioritárias | problema observado, frequência e impacto atual |
| Gatilho de mudança | por que migrar agora e qual risco faria desistir |
| Resultado esperado | métrica operacional ou clínica, sem meta inventada |
| Se SaaS: disposição a pagar | faixa validada, unidade de cobrança e quem pagaria |

## Evidência mínima para fechar o gate

- observar pelo menos uma jornada real de recepção e uma jornada clínica;
- entrevistar ao menos um clinic admin, um clinical lead/fisioterapeuta e pacientes representativos;
- registrar baseline disponível de tempo de evolução, faltas, abandono, uso de HEP e retrabalho;
- declarar quais recursos são necessários antes da primeira ativação com dados reais;
- se a escolha for SaaS, validar demanda com clínicas externas e não apenas interesse informal.

## Consequências da escolha

### Uso interno primeiro

- web e fluxos da clínica atual orientam o MVP;
- multi-tenancy permanece como controle de segurança, sem UI SaaS prematura;
- preço, billing SaaS, white-label e suporte externo permanecem no roadmap, mas não bloqueiam o piloto interno;
- diferenciação de mercado permanece hipótese para validação, não requisito de cada release.

### SaaS desde o início

- onboarding, importação assistida de futuros clientes, suporte e operação multi-cliente tornam-se requisitos antecipados; isso não autoriza importar os dados descartáveis atuais;
- ICP e pacote comercial precisam ser estreitos;
- custo por organização, suporte, observabilidade e incidentes entram no modelo econômico;
- white-label e ERP completos continuam aprovados; o gate define quando viram compromisso comercial e qual profundidade regulatória será oferecida.

## Critério de saída

DG-00 só passa quando todos os campos obrigatórios estiverem preenchidos, a opção estiver aprovada pelo proprietário e as consequências tiverem sido refletidas no charter e no primeiro slice. A decisão deve ser registrada em `decisions/decision-register.md`.
