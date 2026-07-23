# Estrutura proposta do novo repositório

```text
fisioflow-next/
├── apps/
│   ├── api/                    # Hono no Cloudflare Worker
│   ├── web/                    # React/Vite em Worker Assets separado, sem bindings clínicos
│   ├── public-edge/            # booking/sites/formulários/storefront; criar na primeira capacidade pública
│   ├── jobs-integrations/      # Queues, Workflows, webhooks e adapters; criar no primeiro efeito assíncrono
│   ├── realtime/               # Durable Objects/colaboração; criar na onda correspondente
│   ├── ai/                     # gateway, avaliações e agentes; criar na onda correspondente
│   ├── telehealth/             # salas/tokens/gravações por adapter; criar na onda correspondente
│   ├── professional-app/       # Expo/React Native
│   └── patient-app/            # Expo/React Native
├── packages/
│   ├── contracts/              # OpenAPI gerado, DTOs e SDKs
│   ├── domain/                 # value objects e regras puras compartilháveis
│   ├── permissions/            # catálogo e avaliação de permissions
│   ├── db/                     # persistência com fronteiras verificáveis
│   │   ├── migrations/         # único ledger agregado do produto
│   │   ├── modules/            # exports de schema/queries por módulo
│   │   │   ├── identity/
│   │   │   ├── organizations/
│   │   │   └── patients/
│   │   ├── read-models/        # projeções com owner e rebuild explícitos
│   │   └── runtime/            # adapters separados para API e jobs
│   ├── ui-web/                 # componentes DOM
│   ├── ui-mobile/              # componentes React Native
│   ├── design-tokens/          # tokens semânticos compartilhados com Figma
│   ├── mobile-core/            # auth, sync, storage e push compartilhados
│   ├── observability/          # logs, métricas e tracing sem PII
│   ├── testing/                # fixtures sintéticas e helpers
│   └── config/                 # TS/ESLint/Vitest compartilhados
├── infra/
│   ├── cloudflare/             # wrangler por ambiente e bindings declarados
│   ├── neon/                   # bootstrap de roles/logins, Hyperdrive e checks RLS/grants
│   └── github/                 # workflows canônicos
├── docs/
│   ├── adr/
│   ├── api/
│   ├── design/                 # briefings, inventário de telas e decisões Figma/Stitch
│   ├── runbooks/
│   └── product/
├── tooling/
│   ├── codegen/
│   └── scripts/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Regras de fronteira

- `apps/*` podem importar `packages/*`; pacotes nunca importam apps.
- `apps/web` e `apps/api` são Workers e deploys distintos; o Worker web não recebe binding de banco, R2 clínico ou segredo da API.
- `public-edge`, `jobs-integrations`, `realtime`, `ai` e `telehealth` representam deployables aprovados no horizonte, mas suas pastas só são criadas junto da primeira capacidade real. Não criar scaffold vazio.
- Módulos de domínio expõem casos de uso, não tabelas internas.
- `packages/contracts` é gerado do contrato; não editar artefatos gerados à mão.
- O CI gera o SDK e o compila contra web, app profissional e app paciente para impedir drift de contrato.
- Web e mobile compartilham contratos, regras puras, permissões e tokens, **não a árvore inteira de UI**.
- Tokens e componentes têm rastreabilidade com o arquivo Figma; Code Connect ou mapa equivalente liga design e código sem tornar o Figma dependência de runtime.
- Acesso ao banco ocorre somente na API/jobs; apps não recebem connection strings nem Data API ampla.
- `packages/db` exporta cada módulo por subpath explícito. O root não exporta tabelas/queries internas; package exports e lint bloqueiam imports transversais.
- Query entre módulos ocorre por caso de uso ou por read model declarado, com owner, contrato e procedimento de reconstrução.
- API e jobs podem compartilhar tipos/adapters-base, mas não credential nem adapter já instanciado.
- Bindings Cloudflare são encapsulados por adapters e test doubles.
- Cada módulo possui `domain/`, `application/`, `infrastructure/` e `http/` somente quando a complexidade justificar; não criar camadas vazias.
- Migrações têm uma única numeração/ledger e nunca são reescritas depois de aplicadas.

## Primeiro slice esperado

```text
apps/api/src/modules/
├── identity/
├── organizations/
└── patients/

apps/web/src/features/
├── auth/
└── patients/
```

No scaffold inicial, criar somente os módulos do primeiro slice. Biomecânica, wearables, Digital Twin, NFS-e e demais capacidades aprovadas ganham pastas quando suas ondas começarem. Grupos/turmas e DICOM/PACS nunca ganham pasta, placeholder ou abstração.
