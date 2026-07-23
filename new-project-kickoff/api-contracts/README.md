# Contratos de API

## Estado

`openapi.yaml` é o contrato **DRAFT** do primeiro slice somente leitura. Ele não descreve as 1.191 rotas legadas e não deve ser usado para gerar produção antes dos gates de auth, naming e error handling.

## Convenções

- base `/api/v1`;
- JSON `camelCase`;
- IDs opacos UUID;
- timestamp ISO 8601 UTC e `date` para datas civis;
- dinheiro `{ amount: "123.45", currency: "BRL" }`;
- `application/problem+json` com `code`, `traceId` e erros de campo;
- paginação keyset com `cursor` opaco e `limit` máximo 100;
- `Idempotency-Key` obrigatório para mutações que o cliente pode reenviar;
- `version` ou ETag/If-Match para concorrência;
- respostas com dado pessoal/clínico usam `Cache-Control: private, no-store` e não podem ser armazenadas no edge;
- `organizationId`, `actorId` e `patientId` nunca são aceitos como autoridade só porque vieram no body;
- exemplos e fixtures sempre sintéticos.

O cursor é assinado ou autenticado, vinculado ao tenant, filtros e ordenação, possui validade curta e nunca contém PII legível. Cursor inválido, expirado ou usado com outros filtros retorna um `Problem.code` estável. No primeiro slice, a busca de pacientes aceita apenas nome normalizado. CPF, telefone e outros identificadores exigem caso de uso, permission e rate limit próprios para não facilitar enumeração.

## Fluxo de alteração

1. RFC/issue descreve comportamento e risco.
2. Alterar OpenAPI e exemplos.
3. Rodar lint e breaking-change check.
4. Gerar tipos/SDKs.
5. Implementar API e contract tests.
6. Consumir SDK nos clientes.
7. Publicar changelog e telemetria de depreciação.

## Versionamento

- mudança aditiva compatível permanece em v1;
- rename/removal/semântica incompatível exige período de depreciação ou v2;
- eventos possuem versão independente por tipo;
- mobile exige janela maior devido a versões antigas instaladas.

## Segurança

- Staff e paciente usam audiences/credenciais distintas.
- O backend valida issuer, audience, assinatura e expiração antes de chamar o resolver mínimo de identidade.
- O resolver retorna memberships/vínculos candidatos com estado; o servidor só estabelece contexto ativo e o revalida dentro da transação antes de definir o contexto RLS.
- `/me` só retorna membership ativa, seus papéis normalizados e `authorizationVersion`; estados pending/suspended/revoked produzem erro estável.
- Recurso inexistente, de outro tenant ou fora da visibilidade do ator retorna `404`; ator autenticado sem permission global para o caso de uso retorna `403`.
- Campos clínicos são liberados por endpoint/DTO explícito, nunca por serialização direta da tabela.
- Rate limits e Turnstile são definidos por ameaça, não globalmente.
- Cookies de sessão exigem proteção CSRF em toda mutação: `SameSite`, validação de `Origin`/`Sec-Fetch-Site` e token anti-CSRF quando o fluxo escolhido precisar.
- Logs, traces e erros nunca incluem token, cookie, payload clínico ou resposta de idempotência.

## Identidade e contexto de banco

O bootstrap ocorre em duas etapas para evitar dependência circular entre login e RLS:

1. validar a identidade externa;
2. chamar uma função `SECURITY DEFINER` estreita que só resolve IDs e estados possíveis;
3. no staff web, `GET /auth/contexts` lista somente candidatos ligados ao próprio subject e `POST /auth/context` recebe um `membershipId`, nunca um `organizationId` arbitrário;
4. a API calcula `selectable` usando membership ativa, organização ativa e ao menos um papel válido; com um único candidato elegível a UI pode selecioná-lo de forma explícita, com vários exige escolha, e os demais exibem motivo neutro sem criar sessão;
5. revalidar a membership escolhida e estabelecer cookie interno ligado a `identityId + membershipId + authorizationVersion`;
6. abrir transação, definir GUCs com `set_config(..., true)` e revalidar status + `authorizationVersion`;
7. executar o caso de uso e confirmar ou reverter a transação inteira.

O cliente nunca escolhe uma organização ou paciente arbitrário. Conexão reaproveitada pelo pool deve iniciar sem contexto residual; testes cobrem commit, rollback e exceção.

O contrato de bootstrap acima é o caminho web do primeiro slice. Os apps nativos definirão a troca por token interno no gate mobile sem alterar a regra de seleção. OAuth callback usa `state`/PKCE e a operação não aceita cookie clínico já contextualizado como substituto do token pré-contexto.

## Idempotência

O servidor faz claim atômico da chave com estado `processing`, compara o hash da requisição e retorna o resultado concluído somente para a mesma operação. Duas requisições concorrentes não executam o efeito duas vezes. Respostas persistidas são minimizadas, classificadas como sensíveis quando contêm dado pessoal e eliminadas por TTL curto.
