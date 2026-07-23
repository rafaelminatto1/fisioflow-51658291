# Diagrama — Contexto do Sistema (C4 nível 1, AS-IS)

```mermaid
flowchart TB
    subgraph Personas
        ADM[Admin/Gestor]
        FIS[Fisioterapeuta]
        REC[Recepcionista]
        EST[Estagiário]
        PAC[Paciente]
        LEAD[Lead/Visitante]
        MED[Médico externo<br/>(retorno médico via wa.me)]
    end

    FF[FisioFlow<br/>Web desktop + App iOS Pro + App iOS Paciente]

    ADM & FIS & REC & EST --> FF
    PAC -->|Portal + App paciente| FF
    LEAD -->|Webchat do site WP / Instagram / WhatsApp| FF

    subgraph Externos
        META[Meta Graph API<br/>WhatsApp Cloud + Instagram]
        GOOG[Google Calendar/OAuth]
        RESEND[Resend e-mail]
        NFSE[Prefeitura SP NFS-e<br/>mTLS]
        LIVEKIT[LiveKit<br/>telemedicina]
        PUBMED[PubMed/NCBI<br/>evidências]
        WGER[wger<br/>catálogo exercícios]
        AXIOM[Axiom logs]
        SENTRY[Sentry]
        NTFY[ntfy alertas]
        CFAI[Workers AI / AI Gateway<br/>+ Gemini/ZAI]
    end

    FF <--> META
    FF <--> GOOG
    FF --> RESEND
    FF --> NFSE
    FF <--> LIVEKIT
    FF --> PUBMED
    FF --> WGER
    FF --> AXIOM & SENTRY & NTFY
    FF <--> CFAI
```

Evidências: integrações confirmadas por secrets [CF-008] e código (ver `inventories/integrations.csv`). NFS-e: estrutura completa (cert mTLS + workflow declarado) mas 0 notas emitidas em prod [DB-003] e workflow `nfse-emission` não deployado [CF-006] — status PARCIAL.
