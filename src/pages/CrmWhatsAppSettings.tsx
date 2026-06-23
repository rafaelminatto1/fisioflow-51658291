import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Hash,
  Loader2,
  MessageSquareText,
  Plug,
  Plus,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  createQuickReplyRow,
  createTag,
  deleteQuickReply,
  deleteTag,
  fetchCrmSettings,
  fetchQuickReplies,
  fetchTags,
  sendTestMessage,
  updateCrmSettings,
  updateQuickReply,
  type ConciergeConfig,
  type ConciergeIntent,
  type CrmSettings,
  type FunnelStage,
  type QuickReplyRow,
  type Tag,
} from "@/services/whatsapp-api";
import { cn } from "@/lib/utils";

const INTENT_LABELS: Record<ConciergeIntent, string> = {
  scheduling: "Agendamento",
  information: "Informação / dúvida",
  urgent: "Urgência",
  other: "Outros",
};

const TONE_LABELS: Record<ConciergeConfig["greetingTone"], string> = {
  acolhedor: "Acolhedor",
  direto: "Direto",
  formal: "Formal",
};

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-none">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function CrmWhatsAppSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [concierge, setConcierge] = useState<ConciergeConfig | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);

  const [testNumber, setTestNumber] = useState("");
  const [testing, setTesting] = useState(false);

  const [quickReplies, setQuickReplies] = useState<QuickReplyRow[]>([]);
  const [newQrTitle, setNewQrTitle] = useState("");
  const [newQrContent, setNewQrContent] = useState("");

  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#0A84FF");

  useEffect(() => {
    let active = true;
    Promise.all([fetchCrmSettings(), fetchQuickReplies(), fetchTags()])
      .then(([cfg, qrs, tgs]) => {
        if (!active) return;
        setSettings(cfg);
        setConcierge(cfg.concierge);
        setFunnel(cfg.funnel);
        setQuickReplies((qrs as unknown as QuickReplyRow[]) ?? []);
        setTags((tgs as Tag[]) ?? []);
      })
      .catch(() => toast({ title: "Falha ao carregar configurações", variant: "destructive" }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [toast]);

  const dirty = useMemo(() => {
    if (!settings || !concierge) return false;
    return (
      JSON.stringify(concierge) !== JSON.stringify(settings.concierge) ||
      JSON.stringify(funnel) !== JSON.stringify(settings.funnel)
    );
  }, [settings, concierge, funnel]);

  const handleSave = async () => {
    if (!concierge || !dirty) return;
    setSaving(true);
    try {
      const saved = await updateCrmSettings({ concierge, funnel });
      setSettings((prev) => (prev ? { ...prev, concierge: saved.concierge, funnel: saved.funnel } : prev));
      toast({ title: "Configurações salvas" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleApprovalIntent = (intent: ConciergeIntent) => {
    setConcierge((prev) => {
      if (!prev) return prev;
      const has = prev.approvalIntents.includes(intent);
      return {
        ...prev,
        approvalIntents: has
          ? prev.approvalIntents.filter((i) => i !== intent)
          : [...prev.approvalIntents, intent],
      };
    });
  };

  const handleTest = async () => {
    const digits = testNumber.replace(/\D/g, "");
    if (digits.length < 10) {
      toast({ title: "Informe um número válido com DDD", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const res = await sendTestMessage(digits);
      toast({
        title: res.accepted ? "Mensagem de teste enviada" : "Envio recusado pela Meta",
        description: res.accepted
          ? "Confira o WhatsApp do número informado."
          : "Verifique o número e a conta na Meta.",
        variant: res.accepted ? "default" : "destructive",
      });
    } catch {
      toast({ title: "Falha ao enviar teste", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const handleAddQuickReply = async () => {
    if (!newQrTitle.trim() || !newQrContent.trim()) return;
    try {
      const created = await createQuickReplyRow({
        title: newQrTitle.trim(),
        content: newQrContent.trim(),
      });
      setQuickReplies((prev) => [...prev, created]);
      setNewQrTitle("");
      setNewQrContent("");
    } catch {
      toast({ title: "Erro ao criar resposta rápida", variant: "destructive" });
    }
  };

  const handleDeleteQuickReply = async (id: string) => {
    try {
      await deleteQuickReply(id);
      setQuickReplies((prev) => prev.filter((q) => q.id !== id));
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleSaveQuickReply = async (qr: QuickReplyRow) => {
    try {
      await updateQuickReply(qr.id, { title: qr.title, content: qr.content });
      toast({ title: "Resposta atualizada" });
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const created = (await createTag(newTagName.trim(), newTagColor)) as Tag;
      setTags((prev) => [...prev, created]);
      setNewTagName("");
    } catch {
      toast({ title: "Erro ao criar etiqueta", variant: "destructive" });
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      await deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast({ title: "Erro ao remover etiqueta", variant: "destructive" });
    }
  };

  return (
    <PageLayout>
      <PageContainer>
        <div className="mb-4 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link to="/crm-whatsapp" aria-label="Voltar ao CRM">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <PageHeader
            title="Configurações · CRM·WhatsApp"
            subtitle="Conexão, AI Concierge, respostas rápidas e funil"
          />
        </div>

        {loading || !concierge ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
          </div>
        ) : (
          <Tabs defaultValue="conexao" className="w-full">
            <TabsList className="mb-6 flex flex-wrap">
              <TabsTrigger value="conexao" className="gap-1.5">
                <Plug className="h-4 w-4" /> Conexão
              </TabsTrigger>
              <TabsTrigger value="concierge" className="gap-1.5">
                <Bot className="h-4 w-4" /> AI Concierge
              </TabsTrigger>
              <TabsTrigger value="respostas" className="gap-1.5">
                <MessageSquareText className="h-4 w-4" /> Respostas rápidas
              </TabsTrigger>
              <TabsTrigger value="funil" className="gap-1.5">
                <Hash className="h-4 w-4" /> Funil + Etiquetas
              </TabsTrigger>
            </TabsList>

            {/* ── Conexão ── */}
            <TabsContent value="conexao">
              <div className="max-w-2xl space-y-6">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    {settings?.connection.connected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(142_70%_94%)] px-2.5 py-1 text-xs font-bold text-[hsl(142_60%_28%)]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> Não conectado
                      </span>
                    )}
                  </div>
                  <FieldRow label="Número" value={settings?.connection.phoneNumber ?? "—"} />
                  <FieldRow label="Phone Number ID" value={settings?.connection.phoneNumberId ?? "—"} />
                  <FieldRow
                    label="WhatsApp Business Account"
                    value={settings?.connection.businessAccountId ?? "—"}
                  />
                  <FieldRow
                    label="Webhook"
                    value={
                      <span className="max-w-[280px] truncate text-xs font-mono text-muted-foreground">
                        {settings?.connection.webhookUrl}
                      </span>
                    }
                  />
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-1 text-sm font-bold">Enviar mensagem de teste</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Envia o template <code>hello_world</code> para validar a entrega.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={testNumber}
                      onChange={(e) => setTestNumber(e.target.value)}
                      placeholder="Ex.: 11 99999-0000"
                    />
                    <Button onClick={handleTest} disabled={testing}>
                      {testing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span className="ml-1.5">Enviar</span>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── AI Concierge ── */}
            <TabsContent value="concierge">
              <div className="max-w-2xl space-y-6">
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-bold">Concierge ativo</Label>
                      <p className="text-xs text-muted-foreground">
                        Liga/desliga toda a triagem automática por IA.
                      </p>
                    </div>
                    <Switch
                      checked={concierge.enabled}
                      onCheckedChange={(v) => setConcierge({ ...concierge, enabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-bold">Responder leads novos automaticamente</Label>
                      <p className="text-xs text-muted-foreground">
                        Saudação imediata para contatos sem cadastro de paciente.
                      </p>
                    </div>
                    <Switch
                      checked={concierge.autoReplyNewLeads}
                      disabled={!concierge.enabled}
                      onCheckedChange={(v) => setConcierge({ ...concierge, autoReplyNewLeads: v })}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Tom da saudação</Label>
                    <Select
                      value={concierge.greetingTone}
                      onValueChange={(v) =>
                        setConcierge({ ...concierge, greetingTone: v as ConciergeConfig["greetingTone"] })
                      }
                    >
                      <SelectTrigger className="mt-1.5 w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TONE_LABELS) as ConciergeConfig["greetingTone"][]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {TONE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-bold">Exigir aprovação humana</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Para estas intenções, a IA sugere a resposta mas só envia após aprovação.
                  </p>
                  <div className="space-y-3">
                    {(settings?.intents ?? []).map((intent) => (
                      <div key={intent} className="flex items-center justify-between">
                        <span className="text-sm">{INTENT_LABELS[intent]}</span>
                        <Switch
                          checked={concierge.approvalIntents.includes(intent)}
                          onCheckedChange={() => toggleApprovalIntent(intent)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Respostas rápidas ── */}
            <TabsContent value="respostas">
              <div className="max-w-2xl space-y-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-3 text-sm font-bold">Nova resposta rápida</h3>
                  <div className="space-y-2">
                    <Input
                      value={newQrTitle}
                      onChange={(e) => setNewQrTitle(e.target.value)}
                      placeholder="Título (ex.: Horários disponíveis)"
                    />
                    <Textarea
                      value={newQrContent}
                      onChange={(e) => setNewQrContent(e.target.value)}
                      rows={2}
                      placeholder="Conteúdo da mensagem"
                    />
                    <Button onClick={handleAddQuickReply} disabled={!newQrTitle.trim() || !newQrContent.trim()}>
                      <Plus className="mr-1.5 h-4 w-4" /> Adicionar
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {quickReplies.length === 0 && (
                    <p className="px-1 text-sm text-muted-foreground">Nenhuma resposta rápida ainda.</p>
                  )}
                  {quickReplies.map((qr, index) => (
                    <div key={qr.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={qr.title ?? ""}
                            onChange={(e) =>
                              setQuickReplies((prev) =>
                                prev.map((p, i) => (i === index ? { ...p, title: e.target.value } : p)),
                              )
                            }
                            className="font-semibold"
                          />
                          <Textarea
                            value={qr.content ?? ""}
                            rows={2}
                            onChange={(e) =>
                              setQuickReplies((prev) =>
                                prev.map((p, i) => (i === index ? { ...p, content: e.target.value } : p)),
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="secondary" onClick={() => handleSaveQuickReply(qr)}>
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteQuickReply(qr.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ── Funil + Etiquetas ── */}
            <TabsContent value="funil">
              <div className="grid max-w-4xl gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-1 text-sm font-bold">Estágios do funil</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Renomeie os estágios e ajuste as cores (HSL, ex.: <code>211 100% 50%</code>).
                  </p>
                  <div className="space-y-2">
                    {funnel.map((stage, index) => (
                      <div key={stage.key} className="flex items-center gap-2">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full"
                          style={{ background: `hsl(${stage.color})` }}
                        />
                        <Input
                          value={stage.label}
                          onChange={(e) =>
                            setFunnel((prev) =>
                              prev.map((s, i) => (i === index ? { ...s, label: e.target.value } : s)),
                            )
                          }
                          className="flex-1"
                        />
                        <Input
                          value={stage.color}
                          onChange={(e) =>
                            setFunnel((prev) =>
                              prev.map((s, i) => (i === index ? { ...s, color: e.target.value } : s)),
                            )
                          }
                          className="w-32 font-mono text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-3 text-sm font-bold">Etiquetas</h3>
                  <div className="mb-4 flex gap-2">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded border border-border"
                      aria-label="Cor da etiqueta"
                    />
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Nome da etiqueta"
                    />
                    <Button onClick={handleAddTag} disabled={!newTagName.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-bold"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: tag.color ?? "#6b7280" }}
                        />
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(tag.id)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remover ${tag.name}`}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nenhuma etiqueta.</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Save bar (Concierge + Funil) */}
        {dirty && (
          <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t border-border bg-background/95 py-3 backdrop-blur-sm">
            <span className="mr-auto text-sm text-muted-foreground">Alterações não salvas</span>
            <Button
              variant="ghost"
              onClick={() => {
                if (settings) {
                  setConcierge(settings.concierge);
                  setFunnel(settings.funnel);
                }
              }}
            >
              Descartar
            </Button>
            <Button onClick={handleSave} disabled={saving} className={cn(saving && "opacity-70")}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        )}
      </PageContainer>
    </PageLayout>
  );
}
