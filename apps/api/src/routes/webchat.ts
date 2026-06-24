import { Hono } from "hono";
import { createPool } from "../lib/db";
import { broadcastToOrg } from "../lib/realtime";
import { resolveOrCreateContact } from "../lib/whatsapp-identity";
import { findOrCreateConversation, addMessage } from "../lib/whatsapp-conversations";
import { writeEvent } from "../lib/analytics";
import type { Env } from "../types/env";

/**
 * Chat do site (canal `webchat`) — endpoints públicos para o widget embarcado.
 * O widget posta mensagens; o atendente responde pelo CRM e o widget recebe via polling.
 * CORS: o domínio do site precisa estar em ALLOWED_ORIGINS (ver wrangler.toml).
 * Identidade do visitante: `web:{visitorId}` (uuid gerado no navegador, persistido em localStorage).
 */
const app = new Hono<{ Bindings: Env }>();

const MAX_LEN = 2000;

function textOf(content: unknown): string {
  if (typeof content === "string") {
    // jsonb string costuma vir com aspas
    const t = content.trim();
    if (t.startsWith('"') && t.endsWith('"')) {
      try {
        return JSON.parse(t);
      } catch {
        return t;
      }
    }
    return content;
  }
  if (content && typeof content === "object") {
    const r = content as Record<string, unknown>;
    if (typeof r.text === "string") return r.text;
    if (typeof r.body === "string") return r.body;
  }
  return "";
}

async function orgExists(pool: any, orgId: string): Promise<boolean> {
  try {
    const r = await pool.query(`SELECT 1 FROM organizations WHERE id = $1 LIMIT 1`, [orgId]);
    return r.rows.length > 0;
  } catch {
    return false;
  }
}

// Recebe mensagem do visitante.
app.post("/message", async (c) => {
  let body: { org?: string; visitorId?: string; name?: string; phone?: string; text?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Payload inválido" }, 400);
  }

  const orgId = (body.org ?? "").trim();
  const visitorId = (body.visitorId ?? "").trim() || crypto.randomUUID();
  const text = (body.text ?? "").toString().slice(0, MAX_LEN).trim();
  if (!orgId || !text) return c.json({ error: "org e text são obrigatórios" }, 400);

  const pool = await createPool(c.env);
  if (!(await orgExists(pool, orgId))) return c.json({ error: "Organização inválida" }, 404);

  try {
    const waId = `web:${visitorId}`;
    const displayName = body.name?.toString().slice(0, 120) || "Visitante do site";
    const contact = await resolveOrCreateContact(pool, orgId, waId, null, null, null, displayName);
    if (!contact) return c.json({ error: "Falha ao criar contato" }, 500);

    // telefone informado pelo visitante → tenta vincular paciente / guarda no contato
    if (body.phone) {
      const phone = body.phone.toString().replace(/\D/g, "").slice(0, 15);
      if (phone.length >= 10) {
        await pool
          .query(
            `UPDATE whatsapp_contacts SET phone = COALESCE(phone, $2) WHERE id = $1`,
            [contact.id, phone],
          )
          .catch(() => {});
      }
    }

    const conversation = await findOrCreateConversation(pool, orgId, contact.id, "webchat");
    if (!conversation) return c.json({ error: "Falha ao abrir conversa" }, 500);

    const saved = await addMessage(
      pool,
      conversation.id,
      orgId,
      contact.id,
      "inbound",
      "contact",
      contact.id,
      "text",
      text,
      `web_${crypto.randomUUID()}`,
    );

    await broadcastToOrg(c.env, orgId, {
      type: "webchat_message",
      conversationId: conversation.id,
      message: saved,
      contact: { id: contact.id, visitorId },
    });
    writeEvent(c.env, { orgId, event: "webchat_received" });

    return c.json({ visitorId, conversationId: conversation.id });
  } catch (err) {
    console.error("[Webchat] POST /message error:", err);
    return c.json({ error: "Erro interno" }, 500);
  }
});

// Polling: respostas do atendente desde `after`.
app.get("/poll", async (c) => {
  const orgId = (c.req.query("org") ?? "").trim();
  const visitorId = (c.req.query("visitorId") ?? "").trim();
  const after = c.req.query("after") ?? "1970-01-01T00:00:00Z";
  if (!orgId || !visitorId) return c.json({ messages: [] });

  const pool = await createPool(c.env);
  try {
    const conv = await pool.query(
      `SELECT c.id FROM wa_conversations c
       JOIN whatsapp_contacts wc ON wc.id = c.contact_id
       WHERE c.organization_id = $1 AND c.channel = 'webchat' AND wc.wa_id = $2
       ORDER BY c.updated_at DESC LIMIT 1`,
      [orgId, `web:${visitorId}`],
    );
    if (conv.rows.length === 0) return c.json({ messages: [] });

    const msgs = await pool.query(
      `SELECT id, content, created_at
       FROM wa_messages
       WHERE conversation_id = $1 AND direction = 'outbound' AND created_at > $2
       ORDER BY created_at ASC LIMIT 50`,
      [conv.rows[0].id, after],
    );
    return c.json({
      messages: msgs.rows.map((m: any) => ({
        id: m.id,
        text: textOf(m.content),
        at: m.created_at,
      })),
    });
  } catch (err) {
    console.error("[Webchat] GET /poll error:", err);
    return c.json({ messages: [] });
  }
});

// Widget embarcável (vanilla JS, sem dependências).
app.get("/widget.js", (c) => {
  const js = `(function(){
  var s=document.currentScript;
  var ORG=(s&&s.getAttribute('data-org'))||window.FISIOFLOW_WEBCHAT_ORG;
  var API=(s&&s.getAttribute('data-api'))||'https://api-pro.moocafisio.com.br';
  var TITLE=(s&&s.getAttribute('data-title'))||'Fale com a Activity Fisioterapia';
  if(!ORG){console.warn('[FisioFlow webchat] data-org ausente');return;}
  var POS=(s&&s.getAttribute('data-position'))==='left'?'left:20px':'right:20px';
  var BOT=(s&&s.getAttribute('data-bottom'))||'20';
  var VID=localStorage.getItem('ff_webchat_vid')||(crypto.randomUUID?crypto.randomUUID():String(Date.now()));
  localStorage.setItem('ff_webchat_vid',VID);
  var last='1970-01-01T00:00:00Z',open=false,started=false,timer=null;
  var c=document.createElement('div');c.id='fisioflow-webchat';c.style.cssText='position:fixed;'+POS+';bottom:'+BOT+'px;z-index:99999;font-family:system-ui,sans-serif';
  c.innerHTML='<button id=ffb style="width:56px;height:56px;border:none;border-radius:50%;background:#1f7aec;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25)">💬</button>'+
  '<div id=ffp style="display:none;flex-direction:column;width:330px;height:440px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.3)">'+
  '<div style="background:#1f7aec;color:#fff;padding:12px 14px;font-weight:700">'+TITLE+'</div>'+
  '<div id=ffm style="flex:1;overflow-y:auto;padding:12px;background:#f6f7f9;font-size:14px"></div>'+
  '<div style="display:flex;gap:6px;padding:10px;border-top:1px solid #eee">'+
  '<input id=ffi placeholder="Escreva sua mensagem..." style="flex:1;border:1px solid #ddd;border-radius:8px;padding:9px;font-size:14px;outline:none">'+
  '<button id=ffs style="border:none;background:#1f7aec;color:#fff;border-radius:8px;padding:0 14px;cursor:pointer">➤</button></div></div>';
  document.body.appendChild(c);
  var p=c.querySelector('#ffp'),m=c.querySelector('#ffm'),i=c.querySelector('#ffi');
  function add(t,mine){var d=document.createElement('div');d.style.cssText='margin:6px 0;display:flex;'+(mine?'justify-content:flex-end':'');var b=document.createElement('div');b.textContent=t;b.style.cssText='max-width:80%;padding:8px 11px;border-radius:12px;'+(mine?'background:#d8ebff':'background:#fff;border:1px solid #eee');d.appendChild(b);m.appendChild(d);m.scrollTop=m.scrollHeight;}
  function poll(){fetch(API+'/api/webchat/poll?org='+encodeURIComponent(ORG)+'&visitorId='+encodeURIComponent(VID)+'&after='+encodeURIComponent(last)).then(function(r){return r.json()}).then(function(d){(d.messages||[]).forEach(function(x){add(x.text,false);last=x.at;});}).catch(function(){});}
  function send(){var t=i.value.trim();if(!t)return;i.value='';add(t,true);fetch(API+'/api/webchat/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({org:ORG,visitorId:VID,text:t})}).then(function(r){return r.json()}).then(function(){if(!started){started=true;}}).catch(function(){});}
  c.querySelector('#ffb').onclick=function(){open=!open;p.style.display=open?'flex':'none';if(open){if(!m.childNodes.length)add('Olá! Como podemos ajudar?',false);poll();if(!timer)timer=setInterval(poll,4000);}};
  c.querySelector('#ffs').onclick=send;i.addEventListener('keydown',function(e){if(e.key==='Enter')send();});
})();`;
  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});

export { app as webchatRoutes };
