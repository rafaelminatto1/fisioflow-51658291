# Fronteiras dos produtos mobile

## Princípio de superfície

O web desktop recebe a administração completa dos módulos. Os dois apps iOS são produtos por persona e contexto de uso, não cópias reduzidas do web:

- o app profissional otimiza preparação, atendimento, registro, comunicação e trabalho em campo;
- o app paciente concentra plano, cuidado, relacionamento, compras/pagamentos próprios e engajamento;
- capacidade completa no roadmap não implica paridade de tela ou configuração nos apps;
- cada incremento mobile exige permission, finalidade, retenção, offline e telemetria próprios.

## App profissional

### V1 inclui

- login/revogação e troca de contexto somente se a identidade tiver mais de uma membership ativa;
- agenda do dia e mudança de status permitida;
- resumo clínico mínimo antes do atendimento;
- iniciar sessão/modo atendimento;
- ditado pós-sessão ou voz para rascunho, com consentimento quando aplicável;
- rascunho de evolução, revisão e finalização somente online;
- proteção local transitória contra perda de texto, sem prontuário offline completo.

### Expansão por persona

- prescrição/ajuste de HEP, medidas, fotos e Mapa de Resultados;
- Radar e solicitações estruturadas atribuídas;
- teleconsulta, sala de espera e consentimento da sessão;
- colaboração em rascunho, comentários, revisão e aprovação;
- assistentes de IA para ditado, resumo, busca e rascunhos, sempre revisáveis;
- captura consentida de biomecânica/pose e ingestão de medidas de dispositivos suportados;
- tarefas, projetos, timesheet e aprovações atribuídas à membership;
- consulta/movimentação de estoque, pedidos e operações comerciais adequadas ao trabalho em campo;
- leads, conversas e ações de CRM atribuídos, sem administração global de campanhas;
- rascunho clínico offline e resolução de conflito somente após threat model e evidência de conectividade insuficiente.

### Permanece no web

- configuração global da organização, segurança, roles e entitlements;
- contabilidade completa, fechamento, conciliação, fiscal, folha e relatórios gerenciais extensos;
- construção de sites, automações e campanhas complexas;
- configuração de catálogo, preço, armazém, regras de gamificação, modelos e integrações;
- administração de portfólio, recursos e governança de projetos;
- configuração de agentes, ferramentas, modelos e Digital Twin.

O app pode oferecer consultas e aprovações curtas desses domínios quando a persona precisar, sem reproduzir seus consoles completos.

## App paciente

### V1 inclui

- “Seu plano de hoje”;
- HEP ativo inicialmente online e registro idempotente de execução;
- check-in curto e adaptativo; perguntas adicionais somente quando necessárias;
- próximo atendimento, confirmação/cancelamento conforme regra e pedido de remarcação;
- solicitações estruturadas: `duvida_exercicio`, `informar_piora` e `remarcar_atendimento`;
- aviso claro de que o app não é canal de emergência e prazo esperado de resposta;
- consentimentos essenciais, privacidade e logout com limpeza de cache/fila/push.

### Expansão por persona

- metas, marcos, progresso longitudinal e resultados liberados;
- mídia HEP offline e fila de execução, com TTL, revogação e conflitos definidos;
- documentos, termos, relatórios e dados próprios liberados;
- pacote, cobranças, recibos, pagamentos, assinaturas, pedidos, devoluções e histórico comercial próprios;
- teleconsulta, teste de dispositivo e sala de espera;
- chat/mensageria com tipo, roteamento, responsável, consentimento e SLA definidos;
- HealthKit/wearables com permissão granular, revogação, proveniência e explicação de uso;
- gamificação completa: desafios, pontos, níveis, conquistas, ranking opt-in, moeda, loja e inventário virtual;
- recomendações e cenários de IA/Digital Twin somente quando aprovados pelo profissional, identificados como assistidos/experimentais e sem prescrever autonomamente;
- modo cuidador com delegação formal, escopo, validade e revogação.

### Limites permanentes

- sem acesso a notas não liberadas;
- sem diagnóstico, prescrição ou aconselhamento autônomo por IA;
- sem promessa de canal de emergência;
- sem dados de outro paciente, mesmo familiar, sem delegação formal ativa;
- sem exposição pública de dado de saúde em ranking, perfil ou compartilhamento;
- sem grupos/turmas e sem DICOM/PACS.

## Contrato das solicitações e conversas

Cada solicitação precisa ter:

- tipo fechado e linguagem compreensível;
- paciente e objeto relacionado derivados do contexto autenticado;
- texto opcional com limite, sem sugerir diagnóstico automático;
- destino/responsável, estado e prazo esperado;
- orientação de urgência/emergência fora do app;
- auditoria e notificação push sem conteúdo clínico na tela bloqueada.

O v1 usa solicitações estruturadas e threads curtas. Chat livre só entra quando houver triagem, capacidade operacional, retenção e SLA comprovados.

## Offline, dispositivo e wearables

- cache local é mínimo, criptografado, com TTL e limpeza/revogação best effort;
- toda mutação enfileirada é idempotente e reautorizada no servidor;
- push e analytics não carregam PHI;
- HealthKit e sensores exigem entitlement/permission do iOS e consentimento de finalidade separado no produto;
- dado bruto, derivado e interpretação mantêm fonte, unidade, timestamp, algoritmo e qualidade;
- captura de áudio, foto, vídeo ou pose nunca inicia silenciosamente.

## Compartilhamento entre apps

| Compartilhar | Separar |
|---|---|
| auth client, SecureStore, protocolo de sync, push, API SDK | navegação, home, permissions e dados cacheados |
| tokens e componentes básicos RN | features e analytics de produto |
| error handling e observabilidade | release cadence e bundle identifier |
| regras puras de data/format | deep links, HealthKit e entitlements específicos |

## Critério de paridade

Paridade significa que regra, permission e segurança produzem o mesmo resultado em qualquer cliente. Não significa que todas as telas, configurações ou ações do web existam nos dois apps.

## Gates de expansão

Uma capacidade mobile entra quando houver persona, jornada, owner operacional, métrica, contrato de API, permission, dados/retention, comportamento offline e teste de usabilidade definidos. O fato de um módulo ser completo no web não dispensa esses gates.
