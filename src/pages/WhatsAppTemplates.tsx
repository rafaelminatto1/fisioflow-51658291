import { useState, useEffect } from "react";
import {
  FileText,
  RefreshCw,
  Loader2,
  Edit,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Variable,
  Plus,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
  fetchTemplates,
  syncTemplatesWithMeta,
  updateTemplate,
  createTemplate,
  type Template,
} from "@/services/whatsapp-api";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  APPROVED: {
    label: "Aprovado",
    icon: CheckCircle2,
    color: "text-green-600 bg-green-50 border-green-200",
  },
  PENDING: {
    label: "Pendente",
    icon: Clock,
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
  },
  REJECTED: {
    label: "Rejeitado",
    icon: XCircle,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  PAUSED: {
    label: "Pausado",
    icon: Pause,
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
  DISABLED: {
    label: "Desativado",
    icon: XCircle,
    color: "text-gray-400 bg-gray-50 border-gray-200",
  },
  ACTIVE: {
    label: "Ativo",
    icon: CheckCircle2,
    color: "text-green-600 bg-green-50 border-green-200",
  },
};

function highlightVariables(text?: string | null) {
  const parts = (text ?? "").split(/(\{\{[^}]+\}\})/g);
  return parts.filter(Boolean).map((part) => {
    if (/^\{\{[^}]+\}\}$/.test(part)) {
      return (
        <span key={part} className="bg-primary/20 text-primary px-1 rounded font-mono text-xs">
          {part}
        </span>
      );
    }
    return <span key={`t-${part.slice(0, 20)}`}>{part}</span>;
  });
}

function TemplateCard({ template, onEdit }: { template: Template; onEdit: () => void }) {
  const status = STATUS_CONFIG[template.status] || STATUS_CONFIG.DISABLED;
  const StatusIcon = status.icon;
  const categoryLabel = template.category || "general";
  const languageLabel = (template.language || "pt_BR").toUpperCase();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">{template.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {template.isLocal && (
              <Badge variant="secondary" className="text-[10px]">
                Local
              </Badge>
            )}
            <Badge variant="outline" className={`text-[10px] ${status.color}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          {categoryLabel} · {languageLabel}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {template.header && template.header.text && (
          <p className="font-semibold text-sm mb-1">{highlightVariables(template.header.text)}</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {highlightVariables(template.body)}
        </p>
        {template.footer && (
          <p className="text-xs text-muted-foreground mt-2 italic">{template.footer}</p>
        )}
        {template.buttons && template.buttons.length > 0 && (
          <div className="mt-3 space-y-1">
            {template.buttons.map((btn) => (
              <div
                key={btn.text}
                className="text-xs px-2 py-1 rounded border border-border bg-muted/50"
              >
                {btn.text}
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          {template.variables && template.variables.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Variable className="h-3 w-3" />
              {template.variables.length} variável
              {template.variables.length !== 1 ? "is" : ""}
            </div>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
            <Edit className="h-3 w-3 mr-1" /> Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatePreview({ template }: { template: Template }) {
  return (
    <div className="bg-green-50 rounded-lg p-4 max-w-sm mx-auto">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-3">
          {template.header?.text && (
            <p className="font-semibold text-sm mb-2">{highlightVariables(template.header.text)}</p>
          )}
          <p className="text-sm whitespace-pre-wrap">{highlightVariables(template.body)}</p>
          {template.footer && <p className="text-xs text-gray-500 mt-2">{template.footer}</p>}
        </div>
        {template.buttons && template.buttons.length > 0 && (
          <div className="border-t">
            {template.buttons.map((btn) => (
              <div
                key={btn.text}
                className="py-2 text-center text-sm text-blue-600 border-b last:border-b-0"
              >
                {btn.text}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end mt-2">
        <span className="text-[10px] text-green-700">{formatTime(new Date())}</span>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);

  // Create template state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "UTILITY" as "MARKETING" | "UTILITY" | "AUTHENTICATION",
    language: "pt_BR",
    headerText: "",
    body: "",
    footer: "",
    buttons: [] as Array<{
      type: "QUICK_REPLY" | "URL";
      text: string;
      url?: string;
    }>,
  });

  const loadTemplates = async () => {
    try {
      const data = await fetchTemplates();
      setTemplates(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []); // Fixed: added [] to prevent infinite loop

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncTemplatesWithMeta();
      await loadTemplates();
    } catch {
    } finally {
      setSyncing(false);
    }
  };

  const openEdit = (template: Template) => {
    setSelectedTemplate(template);
    setEditBody(template.body);
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await updateTemplate(selectedTemplate.id, { body: editBody });
      setShowEditDialog(false);
      loadTemplates();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.body) return;
    setCreating(true);
    try {
      await createTemplate(createForm);
      setShowCreateDialog(false);
      setCreateForm({
        name: "",
        category: "UTILITY",
        language: "pt_BR",
        headerText: "",
        body: "",
        footer: "",
        buttons: [],
      });
      await loadTemplates();
    } catch (err) {
      console.error("Failed to create template:", err);
    } finally {
      setCreating(false);
    }
  };

  // Build a preview Template object from createForm
  const previewTemplate: Template = {
    id: "preview",
    name: createForm.name || "preview",
    category: createForm.category,
    status: "PENDING",
    language: createForm.language,
    header: createForm.headerText ? { type: "TEXT", text: createForm.headerText } : undefined,
    body: createForm.body || "Escreva o corpo da mensagem...",
    footer: createForm.footer || undefined,
    buttons: createForm.buttons
      .filter((b) => b.text)
      .map((b) => ({ type: b.type, text: b.text, url: b.url })),
    createdAt: new Date().toISOString(),
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-500" />
              Templates WhatsApp
            </h1>
            <p className="text-muted-foreground">
              Gerencie templates de mensagem aprovados pelo Meta
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Novo Template
            </Button>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar com Meta
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum template encontrado"
            description="Sincronize com o Meta para carregar os templates aprovados da sua conta do WhatsApp Business."
            action={
              <Button onClick={handleSync} disabled={syncing}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar com Meta
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => openEdit(template)}
              />
            ))}
          </div>
        )}

        {selectedTemplate && showPreviewDialog && (
          <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Preview: {selectedTemplate.name}</DialogTitle>
              </DialogHeader>
              <TemplatePreview template={selectedTemplate} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Fechar</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {selectedTemplate && showEditDialog && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar template: {selectedTemplate.name}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wa-tpl-body">Conteúdo</Label>
                    <Textarea
                      id="wa-tpl-body"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={8}
                    />
                  </div>
                  {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Variáveis</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedTemplate.variables.map((v) => (
                          <Badge key={v} variant="outline" className="text-xs font-mono">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                  <TemplatePreview template={{ ...selectedTemplate, body: editBody }} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Create Template Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Novo Template WhatsApp
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6">
              {/* Form — left column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do template</Label>
                  <Input
                    placeholder="ex: confirmacao_consulta"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                      }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Letras minúsculas, números e underscores
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={createForm.category}
                      onValueChange={(v) =>
                        setCreateForm((f) => ({
                          ...f,
                          category: v as "MARKETING" | "UTILITY" | "AUTHENTICATION",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="UTILITY">Utilidade</SelectItem>
                        <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select
                      value={createForm.language}
                      onValueChange={(v) => setCreateForm((f) => ({ ...f, language: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt_BR">Português (BR)</SelectItem>
                        <SelectItem value="en_US">English (US)</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cabeçalho (opcional)</Label>
                  <Input
                    placeholder="Texto do cabeçalho"
                    value={createForm.headerText}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        headerText: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Corpo da mensagem *</Label>
                  <Textarea
                    placeholder="Olá {{1}}, sua consulta está confirmada para {{2}}."
                    value={createForm.body}
                    onChange={(e) => setCreateForm((f) => ({ ...f, body: e.target.value }))}
                    rows={5}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use {"{{1}}"}, {"{{2}}"} para variáveis
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Rodapé (opcional)</Label>
                  <Input
                    placeholder="FisioFlow Clínica"
                    value={createForm.footer}
                    onChange={(e) => setCreateForm((f) => ({ ...f, footer: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Botões (opcional)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      className="h-7 text-xs"
                      onClick={() =>
                        setCreateForm((f) => ({
                          ...f,
                          buttons: [...f.buttons, { type: "QUICK_REPLY", text: "" }],
                        }))
                      }
                      disabled={createForm.buttons.length >= 3}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Botão
                    </Button>
                  </div>
                  {createForm.buttons.map((btn, i) => (
                    <div key={i} className="flex gap-2">
                      <Select
                        value={btn.type}
                        onValueChange={(v) =>
                          setCreateForm((f) => ({
                            ...f,
                            buttons: f.buttons.map((b, j) =>
                              j === i ? { ...b, type: v as "QUICK_REPLY" | "URL" } : b,
                            ),
                          }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="QUICK_REPLY">Resposta</SelectItem>
                          <SelectItem value="URL">Link</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Texto do botão"
                        value={btn.text}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            buttons: f.buttons.map((b, j) =>
                              j === i ? { ...b, text: e.target.value } : b,
                            ),
                          }))
                        }
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="h-9 w-9 text-destructive"
                        onClick={() =>
                          setCreateForm((f) => ({
                            ...f,
                            buttons: f.buttons.filter((_, j) => j !== i),
                          }))
                        }
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview — right column */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-3">Preview</p>
                <TemplatePreview template={previewTemplate} />
                <p className="text-[11px] text-muted-foreground mt-3 text-center">
                  O template precisa ser aprovado pelo Meta antes de ser usado
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={handleCreate}
                disabled={creating || !createForm.name || !createForm.body}
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enviar para aprovação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
