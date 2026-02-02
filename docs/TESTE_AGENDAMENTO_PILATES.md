# Teste: criar agendamento tipo Pilates (session_type: group)

## Correção aplicada

O backend passou a normalizar `session_type` antes de gravar no banco:

- Frontend envia `session_type: 'group'`.
- Banco aceita apenas `('individual', 'dupla', 'grupo')`.
- A função `normalizeSessionType` em `functions/src/api/appointments.ts` converte `'group'` → `'grupo'`.

## Deploy

O deploy completo das functions deu **timeout** e o deploy só de `createAppointmentV2` falhou por **quota de CPU** no projeto (Cloud Run):

```text
Quota exceeded for total allowable CPU per project per region.
```

Quando a quota for liberada (ou em outro projeto), faça:

```bash
firebase deploy --only functions:createAppointmentV2
```

## Como testar manualmente (navegador na porta 8084)

1. Subir o app: `npm run dev` (sobe em http://localhost:8084).
2. Fazer login com um usuário que tenha acesso à agenda.
3. Ir em **Agenda** (menu ou `/schedule`).
4. Clicar em **Novo Agendamento**.
5. Selecionar um **paciente**.
6. Escolher **Tipo**: **Pilates Clínico** (ou qualquer tipo que não seja "Fisioterapia").
7. Preencher **data** e **horário**.
8. Clicar em **Criar** / **Agendar**.

**Resultado esperado após o deploy da correção:** agendamento criado com sucesso, sem mensagem "Ocorreu um Erro" nem "invalid input value for enum session_type: \"group\"".

## Teste E2E (Playwright)

Arquivo: `e2e/create-appointment-pilates.spec.ts`.

Requer **credenciais válidas** em `e2e/fixtures/test-data.ts` ou no `beforeEach` (o teste usava `fisio@activityfisioterapia.com.br` que retornou `auth/invalid-credential`).

Rodar (com app em 8084 e credenciais válidas no spec):

```bash
BASE_URL=http://127.0.0.1:8084 npx playwright test e2e/create-appointment-pilates.spec.ts --project=chromium --timeout=60000
```

## Testar com emulador (sem deploy)

Para validar a correção sem depender do deploy:

1. Subir as functions no emulador:
   ```bash
   cd functions && npm run build && cd .. && firebase emulators:start --only functions
   ```
2. Configurar o app para usar o emulador (URL das functions apontando para o emulador).
3. Repetir os passos manuais acima; a chamada será atendida pela função local com `normalizeSessionType`.
