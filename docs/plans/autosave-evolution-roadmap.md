# Roadmap de Evolução: Autosave e Resiliência de Dados

## Objetivo e Motivação
A funcionalidade de salvamento automático (Autosave) da evolução clínica é crítica. Perder informações digitadas pelo profissional gera grande frustração. A implementação atual resolve a maior parte dos problemas com requests do tipo `keepalive` e rascunhos locais (`localStorage`), mas ainda pode evoluir para cenários extremos de perda de conexão e concorrência (ex: profissional usando celular e PC simultaneamente).

Este plano estrutura a implementação técnica das três melhorias arquiteturais levantadas no Brainstorming, além da correção imediata de performance.

---

## Fases de Implementação

### Fase 1: Otimização de Performance no React (Imediato)
**Problema:** A função `save` no `useAutoSave.ts` depende de `data`. A cada letra digitada, o React recria a função e dispara reavaliações desnecessárias nos `useEffect`s associados, consumindo CPU.
**Solução:**
- Refatorar `useAutoSave.ts` para utilizar referências (`dataRef.current`) dentro da função `save`.
- Remover `data` do array de dependências do `useCallback`.
- **Impacto:** Zero *re-renders* desnecessários, digitação mais fluida (especialmente em textos longos) e menor risco de vazamento de memória.

### Fase 2: Controle de Concorrência Otimista (OCC)
**Problema:** "Aba Zumbi". Se um usuário edita no celular e salva, e depois volta a um PC que estava com a aba aberta em uma versão mais antiga, o PC pode disparar um autosave silensioso que sobrescreve o trabalho do celular.
**Solução:**
- **Backend (Cloudflare/Neon):** Implementar validação estrita do campo `version` nas mutações de autosave. Se a versão enviada pelo cliente for menor que a do banco, rejeitar silenciosamente (ou com HTTP 409).
- **Frontend:** Ao receber o 409, em vez de mostrar o modal de conflito de forma intrusiva se o usuário não estava digitando ativamente, o frontend apenas atualiza o estado local para a versão mais recente do servidor (se o form local estiver limpo/sem edições não salvas).
- **Impacto:** Fim definitivo de sobrescritas acidentais de dados.

### Fase 3: Sincronização em Background (Service Worker / IndexedDB)
**Problema:** O navegador tenta honrar requisições `keepalive` ao fechar a aba, mas falhas de rede exatas naquele milissegundo resultam em perda do pacote.
**Solução:**
- Mover a persistência crítica para o Service Worker (PWA).
- Quando o `useAutoSave` detecta falha (via blocos `catch`), a requisição é enfileirada no IndexedDB (utilizando o nosso `offlineSync.ts` atual, porém aprimorado).
- O Service Worker tenta um *Background Sync* (API nativa dos navegadores modernos) assim que a conexão de internet é reestabelecida, mesmo se a aba do FisioFlow não estiver mais aberta.
- **Impacto:** Resiliência nível aplicativo nativo para instabilidades graves de conexão.

### Fase 4: Colaboração em Tempo Real (CRDTs)
**Problema:** O modelo atual bloqueia edições simultâneas (o segundo a salvar recebe um erro 409).
**Solução:**
- Adotar **CRDTs (Conflict-free Replicated Data Types)** usando a biblioteca `Yjs`.
- O estado da evolução passa a ser sincronizado via WebSockets hospedados em **Cloudflare Durable Objects**.
- Cursores visíveis: Quando dois profissionais (ou o mesmo profissional em duas telas) abrem a mesma ficha, as edições aparecem ao vivo, letra a letra.
- **Impacto:** Experiência "Google Docs", sem nenhum conflito de salvamento.

---

## Estratégia de Deploy

1. **A Fase 1 (Performance)** será aplicada imediatamente na codebase atual após a aprovação deste plano.
2. **A Fase 2 (OCC)** deverá ser priorizada no próximo ciclo (Sprint), pois previne um risco real de negócio (perda de dados multitelas).
3. **A Fase 3 (Background Sync)** será agregada às melhorias de PWA e Modo Offline do sistema.
4. **A Fase 4 (CRDT)** requer uma mudança na arquitetura do editor `TipTap` para suportar `Yjs` e a criação de Durable Objects, devendo ser uma Epic própria no Roadmap.