# Central de Notas — auditoria de entrega

Data: 2026-07-29. Escopo de referência: `2026-07-29-fisioflow-notes-design.md`.

## Entregue em produção

- Modelo Neon com RLS para notas, revisões, ACLs, menções, relações, comentários, anexos, tarefas e auditoria.
- Editor TipTap/Yjs com salvamento automático, persistência de snapshot e colaboração em tempo real via Durable Object.
- Tickets de colaboração de uso único, expiração curta e revalidação de ACL antes de atualizações.
- Notas vinculadas a paciente, agendamento e evolução; criação explícita de tarefa e backlinks.
- Compartilhamento por pessoa, cargo ou organização (este último bloqueado para notas clínicas), com revogação auditável.
- Favoritos pessoais persistentes por usuário, sem concessão implícita de acesso à nota.
- Anexos privados no R2, tipos permitidos, limite de 25 MB, download sem cache público e auditoria.
- Comentários com criação, resolução e reabertura.
- `@` autorizado para paciente, pessoa, tarefa, agendamento, evolução e nota, com relação persistente.
- Busca textual e busca semântica somente de notas internas não clínicas, com ACL reavaliada em cada resultado.
- Resumo IA disponível somente para notas internas sem paciente, com limite de entrada, sem cache e auditoria da solicitação.
- Templates iniciais: reunião, nota de equipe, protocolo, pré-atendimento e pós-atendimento.
- Central inicial com filtros por recentes, favoritos, paciente, compartilhadas e templates, preservando ACL no carregamento da lista.
- Restauração de revisões com nova versão, incremento de ACL e recarga coordenada do Durable Object antes do próximo update.
- Exportação HTML autenticada, marcada, sem cache público, e publicação de projeção explícita no portal com validade de 7 a 30 dias e revogação.
- Sanitização conservadora no servidor, exportação text-only e projeção do portal sem HTML canônico; leituras do portal entram na auditoria.
- Restauração de revisão protegida por transação e lock da nota; todas as tabelas de notas estão com RLS e `FORCE ROW LEVEL SECURITY` confirmados em produção.
- Persistência offline passou a ser opt-in explícito, com namespace por organização/usuário/nota e limpeza no logout; o recurso continua desativado por flag.
- Endpoints do portal isolados por `patientId` e `organizationId`, retornando somente a projeção publicada, nunca o conteúdo canônico da nota.
- Flags `notes_clinical_ai`, `notes_offline` e `notes_public_links` adicionadas com default `false`; tentativas de IA clínica são negadas no servidor e auditadas sem depender do frontend.
- Gate de rollout `VITE_FEATURE_NOTES_V1`, ativo por padrão em produção e desligável no build de staging; exemplo em `.env.staging.notes.example`.

## Evidências de validação

- `pnpm --filter @fisioflow/api test`: 161 arquivos e 861 testes aprovados.
- `pnpm --filter fisioflow-web type-check`: aprovado.
- Teste do editor colaborativo: 6 testes aprovados, incluindo ausência de IndexedDB sem opt-in.
- `git diff --check`: aprovado.
- Teste específico de persistência de Notas: WebSocket + Durable Object + Yjs + projeções HTML/texto aprovado.
- Smoke de produção aprovado para `https://www.moocafisio.com.br` e `https://api-pro.moocafisio.com.br/api/health` após os deploys funcionais.

## Itens deliberadamente condicionados (não liberar sem decisão formal)

| Item | Motivo |
| --- | --- |
| IA sobre notas clínicas | Continua bloqueada; exige RIPD/DPO, política organizacional explícita e minimização de dados antes de qualquer envio a modelo. |
| Offline clínico persistente | Exige opt-in por dispositivo confiável, criptografia, TTL e limpeza verificável em logout/revogação. |
| Portal do paciente | Deve usar projeção aprovada e revogável, nunca a nota interna. |
| Links externos compartilháveis | Notas clínicas não admitem link aberto; qualquer modalidade futura exige usuário autenticado, expiração e auditoria. |
| Restauração de versão | Requer protocolo de reset/sincronização do Y.Doc para não permitir que um socket ativo sobrescreva a restauração. |

## Próxima decisão de produto

Para expandir além do MVP sem comprometer LGPD, registrar a finalidade, retenção, responsáveis e procedimento de revogação de cada recurso antes de habilitar flags condicionadas. Não há dependência técnica de um departamento formal de DPO/RIPD para o piloto interno; a revisão operacional e a documentação de privacidade continuam recomendadas. O rollout ocorreu diretamente em produção por instrução do responsável; não foi utilizado staging.
