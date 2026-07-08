import { Hono } from "hono";
import { createPool } from "../lib/db";
import { broadcastToOrg } from "../lib/realtime";
import { resolveOrCreateContact } from "../lib/whatsapp-identity";
import {
	findOrCreateConversation,
	addMessage,
} from "../lib/whatsapp-conversations";
import { writeEvent } from "../lib/analytics";
import type { Env } from "../types/env";
import {
	AIConciergeService,
	buildConciergeHistory,
	conciergeHandoffMessage,
	conciergeIdentity,
	createConciergeBookingTask,
	createConciergeHandoffTask,
	humanOwnsConversation,
	resolveWebchatConciergeConfig,
	stripGreetingIntro,
	wantsHumanAgent,
} from "../services/ai-concierge";
import { needsHumanApproval } from "../lib/whatsappApproval";
import { rateLimit } from "../middleware/rateLimit";

/**
 * Chat do site (canal `webchat`) — endpoints públicos para o widget embarcado.
 * O widget posta mensagens; o atendente responde pelo CRM e o widget recebe via polling.
 * CORS: o domínio do site precisa estar em ALLOWED_ORIGINS (ver wrangler.toml).
 * Identidade do visitante: `web:{visitorId}` (uuid gerado no navegador, persistido em localStorage).
 */
const app = new Hono<{ Bindings: Env }>();

const MAX_LEN = 2000;

/**
 * Resposta de handoff quando o concierge não pode responder (fora do escopo
 * ou conteúdo clínico sensível): o visitante não fica no vácuo e o time é
 * acionado via tarefa no CRM.
 */
const HANDOFF_MESSAGE =
	"Boa pergunta! Essa eu vou deixar com a nossa equipe — já avisei aqui e em breve alguém te responde. Se preferir agilizar, chama a gente no WhatsApp: (11) 93433-5858.";

/**
 * Envia a mensagem de handoff (no máx. 1 a cada 30 min por conversa) e cria
 * tarefa p/ o time responder (no máx. 1 por dia por conversa).
 */
async function sendWebchatHandoff(
	env: Env,
	pool: any,
	orgId: string,
	conversationId: string,
	contactId: string,
	visitorId: string,
	visitorQuestion: string,
): Promise<void> {
	const recentHandoff = await pool.query(
		`SELECT 1 FROM wa_messages
     WHERE conversation_id = $1::uuid
       AND meta_message_id LIKE 'web_handoff_%'
       AND created_at > now() - interval '30 minutes'
     LIMIT 1`,
		[conversationId],
	);
	if (recentHandoff.rows.length > 0) return;

	await addMessage(
		pool,
		conversationId,
		orgId,
		contactId,
		"outbound",
		"system",
		contactId,
		"text",
		HANDOFF_MESSAGE,
		`web_handoff_${crypto.randomUUID()}`,
	);
	await broadcastToOrg(env, orgId, {
		type: "webchat_message",
		conversationId,
		message: { content: HANDOFF_MESSAGE, direction: "outbound" },
		contact: { id: contactId, visitorId },
	});
	writeEvent(env, { orgId, event: "webchat_concierge_handoff" });

	try {
		const dupTask = await pool.query(
			`SELECT 1 FROM tarefas
       WHERE organization_id = $1 AND linked_entity_id = $2
         AND titulo ILIKE 'Responder visitante do site%'
         AND created_at > now() - interval '1 day'
       LIMIT 1`,
			[orgId, conversationId],
		);
		if (dupTask.rows.length === 0) {
			await pool.query(
				`INSERT INTO tarefas (organization_id, created_by, titulo, descricao, status, prioridade, tipo,
           order_index, tags, label_ids, checklists, attachments, task_references, dependencies,
           requires_acknowledgment, acknowledgments, linked_entity_type, linked_entity_id)
         VALUES ($1, 'system', $2, $3, 'A_FAZER', 'ALTA', 'TAREFA',
           0, '{}', '{}', '[]', '[]', '[]', '[]', false, '[]', 'conversation', $4)`,
				[
					orgId,
					"Responder visitante do site — pergunta fora do escopo do concierge",
					`O visitante perguntou no chat do site e o concierge não pôde responder automaticamente:\n\n"${visitorQuestion}"\n\nResponder pela conversa de webchat no CRM.`,
					conversationId,
				],
			);
		}
	} catch (taskErr) {
		console.warn("[Webchat] handoff task creation failed:", taskErr);
	}
}

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
		const r = await pool.query(
			`SELECT 1 FROM organizations WHERE id = $1 LIMIT 1`,
			[orgId],
		);
		return r.rows.length > 0;
	} catch {
		return false;
	}
}

const webchatIpKey = (c: any) =>
	c.req.header("CF-Connecting-IP") ??
	c.req.header("X-Forwarded-For")?.split(",")[0].trim() ??
	"unknown";

// Endpoint público: cada mensagem grava no banco e pode disparar AI — limita por IP.
const messageRateLimit = rateLimit({
	limit: 30,
	windowSeconds: 600,
	endpoint: "webchat-message",
	keyFn: webchatIpKey,
});

// Polling do widget (1 req/4s por aba) — teto generoso só contra abuso.
const pollRateLimit = rateLimit({
	limit: 600,
	windowSeconds: 600,
	endpoint: "webchat-poll",
	keyFn: webchatIpKey,
});

// Recebe mensagem do visitante.
app.post("/message", messageRateLimit, async (c: any) => {
	let body: {
		org?: string;
		visitorId?: string;
		name?: string;
		phone?: string;
		text?: string;
	};
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Payload inválido" }, 400);
	}

	const orgId = (body.org ?? "").trim();
	const visitorId = (body.visitorId ?? "").trim() || crypto.randomUUID();
	const text = (body.text ?? "").toString().slice(0, MAX_LEN).trim();
	if (!orgId || !text)
		return c.json({ error: "org e text são obrigatórios" }, 400);

	const pool = await createPool(c.env);
	if (!(await orgExists(pool, orgId)))
		return c.json({ error: "Organização inválida" }, 404);

	try {
		const waId = `web:${visitorId}`;
		// Só define o nome quando o visitante informa (1ª resposta). NUNCA sobrescreve
		// um nome já capturado com o default em mensagens seguintes.
		const providedName = body.name?.toString().slice(0, 120).trim() || null;
		const contact = await resolveOrCreateContact(
			pool,
			orgId,
			waId,
			null,
			null,
			null,
			providedName,
		);
		if (!contact) return c.json({ error: "Falha ao criar contato" }, 500);
		// Fallback de exibição apenas se o contato ainda não tem nome.
		if (!contact.display_name) {
			await pool
				.query(
					`UPDATE whatsapp_contacts SET display_name = 'Visitante do site' WHERE id = $1`,
					[contact.id],
				)
				.catch(() => {});
		}

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

		const conversation = await findOrCreateConversation(
			pool,
			orgId,
			contact.id,
			"webchat",
		);
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

		// -- AI Concierge: responde automaticamente com delay de 10s --
		// Da chance do humano atender primeiro e evita duplicacao quando o atendente responde pelo CRM.
		// A mensagem de captura de nome (widget manda `name` === texto na 1ª mensagem)
		// não aciona o concierge: o widget já cumprimenta localmente logo em seguida.
		const isNameCapture = !!providedName && providedName === text;
		try {
			// Carrega config do Concierge da organizacao
			const conciergeCfgRes = await pool.query(
				`SELECT settings->'crm_whatsapp'->'concierge' AS concierge
         FROM organizations WHERE id = $1 LIMIT 1`,
				[orgId],
			);
			const webchatCfg = resolveWebchatConciergeConfig(
				conciergeCfgRes.rows[0]?.concierge,
			);
			const greetingSignature = conciergeIdentity(
				conciergeCfgRes.rows[0]?.concierge,
			).signature;
			const rawConciergeCfg = (() => {
				const raw = conciergeCfgRes.rows[0]?.concierge;
				if (typeof raw === "string") {
					try {
						return JSON.parse(raw);
					} catch {
						return {};
					}
				}
				return raw ?? {};
			})();

			if (webchatCfg.enabled && !isNameCapture) {
				// Agenda resposta com delay - mantem o Worker vivo via waitUntil
				const delayedReply = new Promise<void>((resolve) => {
					setTimeout(async () => {
						try {
							// Re-check: um humano assumiu a conversa? (unificado com
							// WhatsApp/Instagram via humanOwnsConversation + humanReplyPauseHours).
							const takeover = await pool.query(
								`SELECT
                   GREATEST(
                     (SELECT MAX(created_at) FROM wa_messages
                        WHERE conversation_id = $1::uuid
                          AND direction = 'outbound'
                          AND sender_type = 'agent'),
                     (SELECT (metadata->>'concierge_handoff_at')::timestamptz
                        FROM wa_conversations WHERE id = $1::uuid)
                   ) AS last_agent_at,
                   (SELECT status FROM wa_conversations WHERE id = $1::uuid) AS conv_status`,
								[conversation.id],
							);

							if (
								humanOwnsConversation(
									takeover.rows[0]?.last_agent_at,
									takeover.rows[0]?.conv_status,
									rawConciergeCfg,
								)
							) {
								// Humano é o dono da conversa - nao envia resposta automatica
								console.log(
									"[Webchat] Atendente assumiu a conversa - Concierge pulando.",
								);
								resolve();
								return;
							}

							// Handoff determinístico (antes do LLM): o visitante pediu um humano.
							if (wantsHumanAgent(text)) {
								const bridge = conciergeHandoffMessage(rawConciergeCfg);
								await addMessage(
									pool,
									conversation.id,
									orgId,
									contact.id,
									"outbound",
									"system",
									contact.id,
									"text",
									bridge,
									`web_handoff_${crypto.randomUUID()}`,
								);
								await pool.query(
									`UPDATE wa_conversations
                     SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{concierge_handoff_at}', to_jsonb(now()::text)),
                         status = 'pending', updated_at = now()
                   WHERE id = $1::uuid`,
									[conversation.id],
								);
								await createConciergeHandoffTask(pool, orgId, conversation.id, text);
								await broadcastToOrg(c.env, orgId, {
									type: "webchat_message",
									conversationId: conversation.id,
									message: { content: bridge, direction: "outbound" },
									contact: { id: contact.id, visitorId },
								});
								writeEvent(c.env, { orgId, event: "webchat_concierge_handoff" });
								resolve();
								return;
							}

							// Busca historico recente para contexto (ultimas 10 mensagens)
							let history: ReturnType<typeof buildConciergeHistory> = [];
							try {
								const historyRes = await pool.query(
									`SELECT direction, content FROM wa_messages
                   WHERE conversation_id = $1::uuid AND message_type = 'text'
                     AND direction IN ('inbound', 'outbound')
                   ORDER BY created_at DESC LIMIT 10`,
									[conversation.id],
								);
								history = buildConciergeHistory([...historyRes.rows].reverse());
								// Remove a mensagem atual (já persistida) do fim — ela é passada à parte.
								const last = history[history.length - 1];
								if (last && last.role === "user" && last.content === text)
									history.pop();
							} catch (histErr) {
								console.warn(
									"[Webchat] Concierge history load failed:",
									histErr,
								);
							}

							const concierge = await AIConciergeService.processMessage(
								c.env,
								orgId,
								text,
								history,
							);

							// Fora do escopo OU conteúdo clínico sensível → humano assume.
							// O visitante recebe um handoff (não fica no vácuo) e o time
							// é acionado por tarefa no CRM.
							const needsHuman =
								!concierge.answerable || needsHumanApproval(concierge.intent, text);
							if (needsHuman) {
								writeEvent(c.env, {
									orgId,
									event: concierge.answerable
										? "webchat_concierge_needs_human"
										: "webchat_concierge_unanswerable",
								});
								await sendWebchatHandoff(
									c.env,
									pool,
									orgId,
									conversation.id,
									contact.id,
									visitorId,
									text,
								);
								resolve();
								return;
							}

							// No webchat o widget SEMPRE se apresenta localmente (esse greet não
							// vai ao banco, então o histórico não serve de sinal). Nunca nos
							// reapresentamos: remove a frase de apresentação, mantendo o resto.
							const reply = stripGreetingIntro(concierge.reply, greetingSignature);

							if (reply && reply.length >= 2) {
								// Insere a resposta do Concierge como mensagem outbound
								await addMessage(
									pool,
									conversation.id,
									orgId,
									contact.id,
									"outbound",
									"system",
									contact.id,
									"text",
									reply,
									`web_auto_${crypto.randomUUID()}`,
								);

								// Broadcast para atualizar o CRM em tempo real
								await broadcastToOrg(c.env, orgId, {
									type: "webchat_message",
									conversationId: conversation.id,
									message: { content: reply, direction: "outbound" },
									contact: { id: contact.id, visitorId },
								});

								writeEvent(c.env, {
									orgId,
									event: "webchat_concierge_replied",
								});

								// Lead confirmou horário → tarefa p/ a equipe efetivar a reserva.
								if (concierge.bookingRequest) {
									await createConciergeBookingTask(
										pool,
										orgId,
										conversation.id,
										concierge.bookingRequest.slotLabel,
										text,
									);
									writeEvent(c.env, { orgId, event: "webchat_concierge_booking" });
								}
								console.log("[Webchat] Concierge respondeu apos delay.");
							}
						} catch (delayedErr) {
							console.error("[Webchat] Concierge delayed error:", delayedErr);
						}
						resolve();
					}, webchatCfg.delayMs);
				});

				// Mantem o Worker vivo durante o delay (Cloudflare Workers)
				if (c?.executionCtx?.waitUntil) {
					c.executionCtx.waitUntil(delayedReply);
				} else {
					delayedReply.catch(() => {});
				}
			}
		} catch (conciergeErr) {
			// Falha no Concierge nao bloqueia o fluxo - o humano assume
			console.error("[Webchat] Concierge error:", conciergeErr);
		}

		return c.json({ ok: true, visitorId });
	} catch (err) {
		console.error("[Webchat] POST /message error:", err);
		return c.json({ error: "Erro interno" }, 500);
	}
});

// Polling: respostas do atendente desde `after`.
app.get("/poll", pollRateLimit, async (c) => {
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

		// `at` precisa sair com precisão de MICROSSEGUNDOS: o widget ecoa esse valor
		// como `after` e o Postgres compara contra timestamptz(µs). Serializar via JS
		// Date trunca em ms e a última mensagem volta em todo poll (loop no widget).
		const msgs = await pool.query(
			`SELECT id, content,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS at
       FROM wa_messages
       WHERE conversation_id = $1 AND direction = 'outbound' AND created_at > $2
       ORDER BY created_at ASC LIMIT 50`,
			[conv.rows[0].id, after],
		);
		return c.json({
			messages: msgs.rows.map((m: any) => ({
				id: m.id,
				text: textOf(m.content),
				at: m.at,
			})),
		});
	} catch (err) {
		console.error("[Webchat] GET /poll error:", err);
		return c.json({ messages: [] });
	}
});

// Widget embarcável (vanilla JS, sem dependências).
app.get("/widget.js", (_c) => {
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
  var last='1970-01-01T00:00:00Z',open=false,started=false,timer=null,seenIds=new Set();
  var NAME=localStorage.getItem('ff_webchat_name')||'';
  function greet(){var h;try{h=parseInt(new Intl.DateTimeFormat('pt-BR',{hour:'numeric',hour12:false,timeZone:'America/Sao_Paulo'}).format(new Date()),10);}catch(e){h=(new Date().getUTCHours()-3+24)%24;}var s=h>=5&&h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';return s+', tudo bem?\\nSou o Rafael da Activity Fisioterapia.\\nComo posso ajudar?';}
    var c=document.createElement('div');c.id='fisioflow-webchat';c.style.cssText='position:fixed;'+POS+';bottom:'+BOT+'px;z-index:99999;font-family:system-ui,sans-serif'; // eslint-disable-line
  c.innerHTML='<button id=ffb style="width:56px;height:56px;border:none;border-radius:50%;background:#1f7aec;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25)">💬</button>'+
  '<div id=ffp style="display:none;flex-direction:column;width:330px;height:440px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.3)">'+
  '<div style="background:#1f7aec;color:#fff;padding:12px 14px;font-weight:700">'+TITLE+'</div>'+
  '<div id=ffm style="flex:1;overflow-y:auto;padding:12px;background:#f6f7f9;font-size:14px"></div>'+
  '<div style="display:flex;gap:6px;padding:10px;border-top:1px solid #eee">'+
  '<input id=ffi placeholder="Escreva sua mensagem..." style="flex:1;border:1px solid #ddd;border-radius:8px;padding:9px;font-size:14px;outline:none">'+
  '<button id=ffs style="border:none;background:#1f7aec;color:#fff;border-radius:8px;padding:0 14px;cursor:pointer">➤</button></div></div>';
  document.body.appendChild(c);
  var p=c.querySelector('#ffp'),m=c.querySelector('#ffm'),i=c.querySelector('#ffi');
  function add(t,mine){var d=document.createElement('div');d.style.cssText='margin:6px 0;display:flex;'+(mine?'justify-content:flex-end':'');var b=document.createElement('div');b.textContent=t;b.style.cssText='max-width:80%;padding:8px 11px;border-radius:12px;white-space:pre-line;'+(mine?'background:#d8ebff':'background:#fff;border:1px solid #eee');d.appendChild(b);m.appendChild(d);m.scrollTop=m.scrollHeight;}
  function poll(){fetch(API+'/api/webchat/poll?org='+encodeURIComponent(ORG)+'&visitorId='+encodeURIComponent(VID)+'&after='+encodeURIComponent(last)).then(function(r){return r.json()}).then(function(d){(d.messages||[]).forEach(function(x){if(!seenIds.has(x.id)){seenIds.add(x.id);add(x.text,false);last=x.at;}});}).catch(function(){});}
  function send(){var t=i.value.trim();if(!t)return;i.value='';add(t,true);var firstName=!NAME;var payload={org:ORG,visitorId:VID,text:t};if(firstName){NAME=t.slice(0,80);localStorage.setItem('ff_webchat_name',NAME);payload.name=NAME;}fetch(API+'/api/webchat/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.json()}).then(function(){started=true;if(firstName){setTimeout(function(){add(greet(),false);},400);}}).catch(function(){});}
  c.querySelector('#ffb').onclick=function(){open=!open;p.style.display=open?'flex':'none';if(open){if(!m.childNodes.length)add(NAME?('Olá de novo! Como posso ajudar?'):'Olá! 😊 Para começarmos, qual é o seu nome?',false);poll();if(!timer)timer=setInterval(poll,4000);}};
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
