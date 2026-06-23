# Botão flutuante Click-to-WhatsApp — site activityfisioterapia.com.br (WordPress/Elementor)

Quick win (Fase 0): botão flutuante que abre uma conversa no WhatsApp da clínica.
A mensagem cai direto no **inbox do CRM** (`/crm-whatsapp`). Captura a origem ("site")
para aparecer em "Origem" no painel do lead.

## Como instalar (Elementor)
1. No Elementor, arraste um widget **HTML** para o rodapé do template do site
   (ou use **Elementor → Site Settings → Custom Code → </body>**).
2. Cole o código abaixo. Ajuste o número se necessário (já está com o da clínica).
3. Publique.

```html
<!-- FisioFlow • Botão WhatsApp flutuante -->
<a id="ff-wa-btn"
   href="https://wa.me/5511587498 85?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20Activity%20Fisioterapia%20e%20gostaria%20de%20agendar%20uma%20avalia%C3%A7%C3%A3o."
   target="_blank" rel="noopener"
   aria-label="Falar no WhatsApp"
   style="position:fixed;right:20px;bottom:20px;z-index:9999;display:flex;align-items:center;gap:10px;
          background:#25D366;color:#fff;padding:12px 18px;border-radius:999px;font-weight:700;
          font-family:system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.25);">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.99-1.052z"/>
  </svg>
  Fale no WhatsApp
</a>
```

## Variações úteis
- **Por página** (ex.: mensagem específica na página de "Avaliação"): troque o texto após `?text=`.
- **CTWA (anúncio):** se o lead vier de um anúncio Click-to-WhatsApp, a origem/campanha já é
  capturada automaticamente pelo backend (ver captura de `referral` no webhook).

## Próximo nível (Fase 2 — widget nativo no site)
Em vez de abrir o app do WhatsApp, um widget de chat **dentro do site** que envia para
endpoints `/api/webchat/*` e aparece no inbox unificado com o selo "Chat do site".
Requer: build do widget + CORS para `activityfisioterapia.com.br` + rate limiting.
