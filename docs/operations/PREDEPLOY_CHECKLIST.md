# Predeploy Checklist - FisioFlow

> Última revisão: 2026-05-02
> Objetivo: checklist executável antes de deployar Workers, web e mudanças de infraestrutura.

---

## Comando padrão

```bash
bash scripts/predeploy-check.sh
```

## Quando usar cada modo

- `bash scripts/predeploy-check.sh --workers` para validar o Worker com `wrangler deploy --dry-run`
- `bash scripts/predeploy-check.sh --audit` para checar dependências com `pnpm audit --audit-level high`
- `bash scripts/predeploy-check.sh --e2e` para rodar smoke tests do Playwright
- `bash scripts/predeploy-check.sh --all` para rodar tudo

---

## Checklist

- [ ] `scripts/check-migrations.sh` passou
- [ ] `pnpm --filter fisioflow-web lint` passou
- [ ] `pnpm --filter @fisioflow/api lint` passou
- [ ] `pnpm --filter fisioflow-web type-check` passou
- [ ] `pnpm --filter @fisioflow/api type-check` passou
- [ ] `pnpm --filter fisioflow-web test:unit` passou
- [ ] `pnpm --filter @fisioflow/api test:unit` passou
- [ ] `pnpm --filter fisioflow-web build` passou
- [ ] `wrangler deploy --dry-run` passou, quando houver alteração em Cloudflare Workers
- [ ] `pnpm --filter fisioflow-web test:e2e:ci --grep "@smoke"` passou, quando houver mudança de fluxo de UI
- [ ] `pnpm audit --audit-level high` passou, quando houver mudança sensível ou release maior

---

## Regra prática

Se a mudança tocar mais de uma camada, rode o pacote completo. Se tocar só UI, rode web + e2e. Se tocar só Workers, rode lint/type-check/api tests/migrations/wrangler dry-run. Se tocar somente documentação, o checklist pode ser reduzido ao que a mudança realmente afeta.
