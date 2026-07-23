# Diagrama — Offline e Sincronização Mobile (AS-IS)

```mermaid
flowchart TB
    subgraph Web [Web (src/)]
        PQC[PersistQueryClient<br/>cache de leitura persistido]
        OM[Optimistic mutations +<br/>badge Pendente via usePendingSyncIds]
        BAN[Banner global offline]
    end

    subgraph Pro [App iOS Pro]
        SS[store/sync-store.ts<br/>fila de mutações persistida]
        NI1[NetInfo → replay]
        CONF[Modal de conflito]
        NOPERSIST1[⚠️ SEM persistência do cache de leitura]
        NOCLEAN[⚠️ logout NÃO limpa fila/cache/push-token]
    end

    subgraph Pac [App iOS Paciente]
        OMGR[lib/offlineManager.ts<br/>fila com retries]
        NI2[NetInfo → replay]
        NOPERSIST2[⚠️ SEM persistência do cache de leitura]
    end

    API[fisioflow-api]
    SS --> NI1 --> API
    OMGR --> NI2 --> API
    OM --> API
```

Estado: web tem o offline-first mais completo; apps têm fila de escrita mas cache de leitura volátil (cold start offline = telas vazias). Idempotência das mutações reenfileiradas: não verificada (pergunta em aberto QA-MOB-01). Push: Expo Push nos dois apps via `/api/push-subscriptions`; sem universal links. Detalhe com evidências em `12-web-e-apps-ios.md`.
