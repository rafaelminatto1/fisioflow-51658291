# Contrato de sincronização offline

## Princípio

Offline é uma capacidade por jornada. Não significa replicar todo o banco no aparelho.

## Pode ficar offline

| App | Leitura/cache | Mutação enfileirável |
|---|---|---|
| Profissional | agenda recente, resumo mínimo, formulário/medidas autorizados | rascunho de evolução, medidas ainda não finalizadas, observação local |
| Paciente | plano HEP ativo, vídeos selecionados, agenda própria | execução de exercício, dor/dificuldade/confiança, confirmação local pendente |

## Deve permanecer online

- finalizar/assinar evolução;
- alterar conduta automaticamente;
- mudar role/membership;
- pagamento/reembolso;
- assinatura de documento;
- exclusão/exportação LGPD;
- criar/cancelar compromisso quando conflita com disponibilidade, salvo pedido pendente;
- ações administrativas.

## Mutation envelope

```json
{
  "mutationId": "uuid-generated-on-device",
  "entityType": "exerciseExecution",
  "entityId": "uuid",
  "baseVersion": 3,
  "occurredAtClient": "2026-07-13T12:00:00Z",
  "payload": {},
  "schemaVersion": 1
}
```

`mutationId` é também o valor canônico do header `Idempotency-Key`; não existe um segundo identificador concorrente. `baseVersion` é obrigatório para atualização concorrente e omitido em inserts realmente append-only. O servidor acrescenta `receivedAtServer` e sinaliza clock skew: o relógio do aparelho é uma alegação, nunca a ordem clínica oficial.

## Estados locais

`queued → sending → acknowledged` ou `queued → conflict/rejected`. Retry técnico nunca cria nova `mutationId`. O servidor guarda idempotência por ator+rota+chave e valida hash do payload. Antes de cada replay, revalida token, membership/vínculo, permission, tenant e estado do recurso; autorização válida no momento do enqueue não autoriza o sync posterior.

## Conflitos

- append-only (execução HEP): dedup e aceitar fora de ordem dentro da política;
- rascunho de evolução: versão base + merge explícito/diff; nunca last-write-wins silencioso;
- agenda: servidor revalida disponibilidade e retorna alternativa;
- recurso finalizado: rejeitar edição offline e preservar rascunho local para cópia/revisão.

Mutação rejeitada por acesso revogado não é enviada sob outra identidade. O app a mantém criptografada apenas pelo prazo de recuperação definido e orienta o usuário a procurar suporte, sem exibir conteúdo depois que a sessão perdeu autorização.

## Segurança local

- namespaces por app+identity+organization, sem compartilhamento entre contas;
- datastore local criptografado; chave não exportável protegida pelo Keychain/Secure Enclave quando disponível e arquivos com iOS Data Protection;
- SecureStore guarda a chave/segredo pequeno, não substitui criptografia do banco clínico inteiro;
- nenhum PHI em push, analytics, crash breadcrumb ou nome de arquivo;
- logout/revogação elimina a chave, token, cache, mídia, fila e push registration; apagar a chave deve tornar resíduos ilegíveis;
- TTL por tipo de dado e limpeza em background;
- aparelho comprometido/offline por tempo excessivo exige reautenticação antes de abrir dado clínico.

Remote wipe é **best effort**: depende de o aparelho voltar a ficar online. MDM não é presumido. Antes de habilitar offline clínico, threat model e teste em dispositivo físico precisam comprovar bloqueio, backup, screenshots/preview quando aplicável e comportamento após rotação/revogação.

## Telemetria

Medir tamanho/idade da fila, retries, conflitos, rejeições, tempo até sync e perda de mutação sem registrar conteúdo clínico.
