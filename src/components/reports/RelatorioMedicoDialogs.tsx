import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  RelatorioMedicoData,
  RelatorioTemplate,
} from "@/pages/relatorios/RelatorioMedicoPage";

export function RelatorioMedicoTemplateDialog({
  open,
  onOpenChange,
  editingTemplate,
  templateForm,
  setTemplateForm,
  toggleCampo,
  handleSubmit,
  isSaving,
  fieldOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: RelatorioTemplate | null;
  templateForm: RelatorioTemplate;
  setTemplateForm: React.Dispatch<React.SetStateAction<RelatorioTemplate>>;
  toggleCampo: (campoId: string) => void;
  handleSubmit: () => void;
  isSaving: boolean;
  fieldOptions: Array<{ id: string; label: string }>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingTemplate ? "Editar modelo" : "Novo modelo"}
          </DialogTitle>
          <DialogDescription>
            Defina os campos obrigatórios e o tipo de relatório para reutilizar rapidamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do modelo</Label>
            <Input
              value={templateForm.nome}
              onChange={(e) =>
                setTemplateForm((prev) => ({
                  ...prev,
                  nome: e.target.value,
                }))
              }
              placeholder="Ex: Avaliação ortopédica detalhada"
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={templateForm.descricao}
              onChange={(e) =>
                setTemplateForm((prev) => ({
                  ...prev,
                  descricao: e.target.value,
                }))
              }
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de relatório</Label>
            <Select
              value={templateForm.tipo_relatorio}
              onValueChange={(v) =>
                setTemplateForm((prev) => ({
                  ...prev,
                  tipo_relatorio: v as RelatorioMedicoData["tipo_relatorio"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inicial">Avaliação inicial</SelectItem>
                <SelectItem value="evolucao">Evolução</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="interconsulta">Interconsulta</SelectItem>
                <SelectItem value="cirurgico">Pré/Pós-operatório</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Campos incluídos</Label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {fieldOptions.map((campo) => (
                <label key={campo.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={templateForm.campos.includes(campo.id)}
                    onCheckedChange={() => toggleCampo(campo.id)}
                  />
                  {campo.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar modelo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RelatorioMedicoGoogleTemplateDialog({
  open,
  onOpenChange,
  templates,
  onSelectTemplate,
  isGenerating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Array<{ id: string; name: string }>;
  onSelectTemplate: (templateId: string) => void;
  isGenerating: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecione um Modelo do Google Docs</DialogTitle>
          <DialogDescription>
            Seus templates do Google Drive que contêm "Template" ou "Modelo" no nome.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4"
                  onClick={() => onSelectTemplate(template.id)}
                  disabled={isGenerating}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-xs text-muted-foreground">Google Docs Template</span>
                  </div>
                </Button>
              ))}
              {templates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum template encontrado no seu Google Drive.
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
