# Documentação de planejamento — FisioFlow (Web + iOS Paciente + iOS Profissional) com Firebase + Google Cloud

**Você decidiu:** manter **3 produtos** (Web + App Paciente + App Profissional) e trocar o backend para o ecossistema Google: **Firebase Auth + Firestore + Cloud SQL + Firebase/Google Cloud**.

**Objetivo do documento:** te dar um plano minucioso (arquitetura + organização de repositórios + segurança + UX/UI + roadmap), sem executar nada ainda.

**Contexto de escala:** ~**600 atendimentos/mês** e **~15 profissionais**.

---

## 1) Visão de produto (por app)

### 1.1 Web (admin/operacional)
**Papel:** operação e gestão: agenda, cadastro, faturamento, relatórios, configurações e auditoria.

**Foco UX:** produtividade + visão de fila + dashboards.

### 1.2 App Paciente (iOS)
**Papel:** execução do tratamento e aderência: plano do dia, exercícios, check-ins de dor, comunicação, lembretes.

**Foco UX:** simplicidade + consistência + mínimo de fricção.

### 1.3 App Profissional (iOS)
**Papel:** prescrição e acompanhamento clínico: agenda do dia, paciente 360, criação de plano, reavaliação, adesão, alertas.

**Foco UX:** velocidade (1–3 toques), templates e automações.

> **Por que 2 apps mobile separados faz sentido:** paciente precisa de experiência “leve”; profissional precisa de ferramentas “densas”. Isso reduz ruído e acelera evolução de cada público.

---

## 2) Stack Google: como encaixar Firestore + Cloud SQL sem confusão

### 2.1 Princípio: cada banco com um papel claro
- **Cloud SQL (Postgres recomendado)**: dados **transacionais e relacionais**  
  Ex.: pacientes, sessões, agenda, faturamento, permissões, auditoria.
- **Firestore**: dados **realtime e “UX-first”** (leitura rápida, feed, presença)  
  Ex.: chat, notificações in-app, check-in diário, aderência, eventos de UI.

> **Regra prática:** se precisa de JOINs, integridade forte e relatórios complexos → Cloud SQL.  
> Se precisa de “realtime”, offline e telas que dependem de stream de eventos → Firestore.

### 2.2 Firestore “direct-to-client” vs “via backend”
- Para coleções **simples e muito bem protegidas** (ex.: check-in do próprio paciente), o app pode ler/gravar direto no Firestore usando **Security Rules** (sempre com `request.auth`). O Firebase mostra padrões de regras exigindo autenticação e restringindo dados por `request.auth.uid`. citeturn0search4turn0search5
- Para qualquer coisa sensível/complexa (ex.: prontuário, mudança de papel, cálculos, relatórios), use **backend** (Cloud Run/Cloud Functions) com Admin SDK e mantenha Firestore “fechado” (deny by default). O Firebase recomenda regras fechadas (deny all) e alerta sobre regras inseguras. citeturn0search7turn0search6

### 2.3 Onde entra o backend (Cloud Run / Cloud Functions)
Você vai precisar de um “**BFF**” (Backend-for-Frontend) para:
- falar com o **Cloud SQL** (o app não conecta direto);
- aplicar regras clínicas e validações;
- gerar relatórios/exports;
- setar **roles** e claims (admin).

**Conexão Cloud Run → Cloud SQL:** a documentação do Google explica o uso dos conectores e que eles fornecem criptografia e autorização baseada em IAM ao conectar em Cloud SQL. citeturn0search2turn0search8

---

## 3) Autenticação, papéis e permissões (Firebase Auth)

### 3.1 Auth
- Firebase Auth para login (email/senha, Apple, Google, etc.).
- Separar “identidade” (Auth) de “perfil” (dados do usuário) no Cloud SQL / Firestore.

### 3.2 Papéis (RBAC) com **Custom Claims** — recomendado
Você tem vários papéis: **paciente, fisioterapeuta, estagiário, administrador, educador físico**.  
O Firebase recomenda usar **custom claims** para controle de acesso e reforça que claims devem ser setadas em ambiente privilegiado (Admin SDK). citeturn1search0turn1search3

**Padrão sugerido:**
- `role`: `"patient" | "physio" | "intern" | "admin" | "trainer"`
- `tenantId`: id da clínica (hoje 1; futuro multi-clínica)
- `permissions`: opcional (escopos)

### 3.3 Enforçar acesso em TODOS os lugares
- **Firestore**: Security Rules usando `request.auth` e claims. Exemplos do Firebase mostram regras usando `request.auth` para restringir leitura/escrita ao autor/UID. citeturn0search3turn0search4
- **Backend**: valida token com Admin SDK (ID token) e valida claims. citeturn1search0turn1search3
- **Cloud SQL**: autorização sempre no backend (camadas).

---

## 4) Segurança extra: App Check (anti-abuso)

Para proteger Firestore/Storage/Functions e seu backend custom:
- O Firebase explica que **App Check** bloqueia clientes não autorizados e usa atestação (App Attest/DeviceCheck no iOS, Play Integrity no Android, reCAPTCHA no web). citeturn1search1
- Há docs de como **enviar tokens** e **verificar tokens** em um backend custom. citeturn1search4turn1search5

---

## 5) Organização de repositórios (recomendação forte: monorepo)

Você quer 3 produtos + shared UI/UX consistente. Melhor cenário é **monorepo**.

### 5.1 Estrutura sugerida
```
fisioflow/
  apps/
    web/                 # painel (admin/operacional)
    ios-paciente/        # app paciente
    ios-profissional/    # app profissional
  services/
    api/                 # Cloud Run (BFF) - fala com Cloud SQL e Admin SDK
    functions/           # Cloud Functions (se usar gatilhos/eventos)
  packages/
    ui/                  # design system (tokens + componentes)
    domain/              # regras de negócio (tipos, validações, casos de uso)
    data/                # clients (firestore, auth), cache, repos
    analytics/           # eventos, funis, métricas
    types/               # Zod/TS schemas compartilhados
  infra/
    terraform/           # opcional (GCP)
  docs/
    arquitetura.md
    rbac.md
    firestore-rules.md
```

### 5.2 Por que monorepo
- **Design system único** → UI “premium” consistente
- Regras compartilhadas → menos bugs
- Onboarding mais rápido

---

## 6) Ambientes (dev / staging / prod) no Firebase + GCP

**Recomendação: 3 Firebase Projects**
- `fisioflow-dev`
- `fisioflow-staging`
- `fisioflow-prod`

Cada app (web, paciente, profissional) vira um “app” dentro do mesmo Firebase Project por ambiente.

---

## 7) Distribuição e qualidade (iOS)

### 7.1 Testes internos com Firebase App Distribution
O Firebase destaca que o App Distribution permite distribuir builds iOS/Android para testers, gerenciar grupos e integrar com CI (CLI/fastlane). citeturn0search1

**Sugestão:**
- App Profissional: sempre primeiro em beta interno
- App Paciente: beta com 30–50 pacientes

---

## 8) Decisão de tecnologia do app iOS (nativo vs cross)

Firebase funciona bem em:
- **React Native** (rápido para evoluir 2 apps)
- **Swift/SwiftUI** (máxima “iOS feel”, custo maior)

**Recomendação prática:** começar com **cross-platform** para entregar rápido e manter 2 apps; levar partes para nativo só se houver necessidade real.

---

## 9) UX/UI: o que faz virar “app premium” (estilo MFIT)

### 9.1 Design system (obrigatório)
- Tokens (cores, tipografia, spacing)
- Componentes base: Button, Card, Input, Tabs, Modal, Toast, Skeleton
- Estados: loading, empty, error, success (sempre)

### 9.2 Layout sugerido — Paciente
**Home**
- “Plano de hoje” (CTA iniciar)
- “Dor hoje” (EVA + local)
- “Próxima sessão”
- “Progresso” (streak + aderência)

**Exercício**
- vídeo + contador + RPE/dor pós
- “não consegui” com motivo

### 9.3 Layout sugerido — Profissional
**Agenda**
- hoje + amanhã + filtros
- alertas (baixa aderência, dor subindo, faltas)

**Paciente 360**
- timeline (sessões, notas, questionários)
- plano atual + aderência
- reavaliação (templates)

**Prescrição**
- construtor drag/drop
- progressão baseada em critérios

---

## 10) Funcionalidades que mais aumentam engajamento (prioridade)

### Impacto alto / esforço baixo (MVP)
- Push “plano do dia”
- Streak + metas realistas
- Check-in rápido (dor/RPE)
- Reagendamento em 2 cliques
- Feedback positivo (sem infantilizar)

### Diferenciais (V1)
- PROMs (DASH, SPADI, VISA-P etc.) com gráficos
- Alertas para o fisio quando dor piora
- Vídeos curtos do fisio (personalização)

---

## 11) Roadmap passo a passo (sem executar ainda)

### Fase 0 — Especificação (1–2 semanas)
1. Lista de telas MVP Paciente (10–12) e Profissional (10–12)
2. Matriz RBAC (quem vê o quê)
3. Modelo de dados (Cloud SQL + Firestore)
4. Eventos de analytics (funil de aderência)

### Fase 1 — Fundação (2–4 semanas)
1. Monorepo + packages
2. Design system
3. Auth + claims
4. Backend BFF (Cloud Run) + Cloud SQL
5. Regras Firestore “deny by default” + coleções seguras

### Fase 2 — MVP Paciente (4–8 semanas)
1. Plano do dia + execução
2. Check-in dor/RPE
3. Streak + push
4. “Próxima sessão”

### Fase 3 — MVP Profissional (4–8 semanas)
1. Agenda
2. Prescrição de plano
3. Aderência e alertas
4. Templates de evolução

### Fase 4 — Beta controlado (2–4 semanas)
1. App Distribution/TestFlight
2. Ajustes por dados (retenção/aderência)
3. Publicação Paciente (App Store)

---

## 12) Referências oficiais (Google/Firebase)
- Firestore Security Rules (request.auth, padrões) citeturn0search4turn0search5turn0search3
- Evitar regras inseguras / “deny all” citeturn0search7turn0search6
- Custom Claims para RBAC (Admin SDK) citeturn1search0turn1search3
- App Check (proteção contra abuso) citeturn1search1turn1search4turn1search5
- Conectar Cloud Run ao Cloud SQL citeturn0search2turn0search8
- Firebase App Distribution citeturn0search1
