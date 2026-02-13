# Status do Plano de Implementação - FisioFlow

**Data:** 24 de Janeiro de 2026
**Responsável:** Agente de Implementação (Antigravity)

## 🚀 Status Geral

Estamos iniciando a execução do plano consolidado, focado em duas grandes frentes estratégicas:

1.  **Migração para Google Cloud / Firebase**: Para otimização de custos e escalabilidade.
2.  **Desenvolvimento Mobile Nativo (iOS)**: Utilizando React Native + Expo para agilidade e performance.

---

## 📱 Frente Mobile (React Native + Expo)

**Decisão:** React Native + Expo foi escolhido como stack definitiva.

**Status Atual:**
- [x] Documentação técnica atualizada.
- [x] Projeto Expo inicializado em `mobile/`.
- [x] Firebase Auth configurado.
- [x] Navegação por Abas implementada.
- [x] **MVP Mobile (Mock) Concluído**:
    - Tela de Pacientes (Service mockado).
    - Tela de Agenda (Service mockado).
    - Tela de Exercícios (Service mockado).
    - Dashboard inicial.

**Próximos Passos:**
1.  Conectar Services ao Firebase Data Connect real (quando deployado).
2.  Implementar formulários de criação/edição.
3.  Migrar Backend Web para usar os mesmos serviços.

---

## ☁️ Frente Backend (Firebase / Google Cloud)

**Decisão:** Migração de Vercel/Supabase para Firebase (Hosting, Functions, Data Connect).

**Status Atual:**
- [x] Schemas do Data Connect validados (`.gql`).
- [x] Cloud Functions validadas (já utilizam `pg` para Cloud SQL).
- [x] Script de inicialização SQL criado (`scripts/db/init_cloud_sql.sql`).
- [x] Arquivos de configuração (`firebase.json`, `dataconnect/`, `functions/`) validados.

**Próximos Passos:**
1.  Executar script SQL no Cloud SQL (via CLI ou Console).
2.  Deploy das Cloud Functions (`firebase deploy --only functions`).
3.  Deploy do Data Connect (`firebase deploy --only dataconnect`).

---

## 📝 Documentação Atualizada

Os seguintes documentos foram revisados e atualizados para refletir estas decisões:
- `FISIOFLOW_PLANEJAMENTO_COMPLETO.md`
- `README.md`
- `docs/mobile/README.md`
- `docs/mobile/REQUISITOS_IOS.md`
- `docs/mobile/GUIA_IMPLEMENTACAO.md`
- `docs/mobile/ESTADO_ATUAL.md`
- `docs/mobile/RESUMO_IMPLEMENTACAO.md`
- `docs/mobile/START_HERE.md`
- `docs2026/13-roadmap.md`
- `PLANEJAMENTO_ESTRATEGICO_COMPLETO.md`

**Este documento serve como handover para o início da implementação técnica.**
