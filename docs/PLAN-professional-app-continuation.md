# PLAN: Professional App Continuation & Mathematical Refinement

## Contexto & Visão Geral
Este plano dá sequência ao trabalho realizado pelo Claude Code no `apps/professional-app`, backend (`apps/api`) e módulo cinemático (`packages/core`).

---

## 🎯 Prioridades e Fases de Execução

### 1. Auditoria Matemática Clínica (`packages/core/src/biomechanics`)
- **Valgo Dinâmico / FPPA**: Verificar cálculo do desvio angular (`180 - angle`), multiplicador de lateralidade (-1 perna esquerda, +1 direita) e fallback para casos sem visibilidade (`null`).
- **Cadência de Marcha (`cadenceSpm`)**: Validar se os picos de contato identificam passos ou passadas (fator 2).
- **Filtragem de Sinal (`smoothSeries` / Butterworth)**: Auditar deslocamento de frequência de corte no filtro bidirecional e preservação rigorosa de lacunas (`null`).
- **Referência de FPPA**: Avaliar o uso da mediana dos primeiros frames válidos em substituição ao 1º frame isolado.

### 2. Restauração & Re-skin do WhatsApp Chat (`app/whatsapp-chat/[id].tsx`)
- Refazer o re-skin visual da tela de conversa alinhando ao design system e ao inbox já re-estilizado (`app/(tabs)/whatsapp.tsx`).
- Manter fidelidade estrita aos modelos do banco de dados (sem adicionar Cockpit de funil de vendas não suportado).

### 3. Validação E2E da Captura Biomecânica no Dispositivo (iOS)
- Testar no iPhone 15 Pro via USB a gravação de vídeo, extração de landmarks, envio NDJSON ao R2 e cálculo do laudo com travas de procedência.

### 4. Resolução da Dívida de Tipos (ADR-002)
- Tratar os erros remanescentes do `tsc` e habilitar o script de catraca `scripts/typecheck-ratchet.mjs`.

---

## 📋 Checklist de Verificação
- [ ] Testes do `@fisioflow/core` passando 100% com fixtures analíticas
- [ ] Testes de rotas da API em `@fisioflow/api` sem regressões
- [ ] App compilando com 0 erros de TypeScript
- [ ] Fluxo de captura e laudo assinado verificado em produção no Neon
