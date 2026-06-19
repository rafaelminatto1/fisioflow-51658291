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
    <div className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="relative group">
          <Input
            placeholder="Título da página..."
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-80 font-bold font-display text-lg border-transparent hover:border-slate-100 focus:border-blue-500 bg-transparent transition-all px-0 focus:ring-0"
          />
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 scale-x-0 group-focus-within:scale-x-100 transition-transform origin-left" />
        </div>
        <Input
          placeholder="Icon"
          value={icon}
          onChange={(event) => onIconChange(event.target.value)}
          className="w-16 h-10 text-center text-xl rounded-xl bg-slate-50 border-slate-100 focus:ring-4 focus:ring-blue-500/5 transition-all"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onTogglePreview} className="rounded-xl font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50">
          {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showPreview ? "Ocultar" : "Preview"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRecoverDraft}
          className="rounded-xl font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50"
          title="Recuperar rascunho salvo localmente"
        >
          <ClockIcon className="mr-2 h-4 w-4" />
          Rascunho
        </Button>
        <div className="w-px h-6 bg-slate-100 mx-1" />
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50">
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button premium glow size="sm" onClick={onSave} className="rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 px-6">
          <Save className="mr-2 h-4 w-4" />
          Publicar
        </Button>
      </div>
    </div>
  );
}
