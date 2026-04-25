import { Clock as ClockIcon, Eye, EyeOff, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WikiEditorHeader({
  title,
  icon,
  showPreview,
  onTitleChange,
  onIconChange,
  onTogglePreview,
  onRecoverDraft,
  onCancel,
  onSave,
}: {
  title: string;
  icon: string;
  showPreview: boolean;
  onTitleChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onTogglePreview: () => void;
  onRecoverDraft: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b bg-background px-6 py-3">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Título da página..."
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="w-64 font-semibold"
        />
        <Input
          placeholder="Emoji"
          value={icon}
          onChange={(event) => onIconChange(event.target.value)}
          className="w-20 text-center text-xl"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onTogglePreview}>
          {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showPreview ? "Ocultar preview" : "Mostrar preview"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRecoverDraft}
          title="Recuperar rascunho salvo localmente"
        >
          <ClockIcon className="mr-2 h-4 w-4" />
          Recuperar
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button size="sm" onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />
          Salvar
        </Button>
      </div>
    </div>
  );
}
