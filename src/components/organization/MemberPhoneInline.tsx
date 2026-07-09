import { useState } from "react";
import { Phone, Pencil, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MemberPhoneInlineProps {
  phone: string | null | undefined;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (phone: string) => void;
}

/**
 * Telefone do membro editável inline (aba Equipe). Usado pelo WhatsApp de
 * tarefas URGENTES — sem telefone o membro só recebe notificação in-app.
 */
export function MemberPhoneInline({ phone, canEdit, isSaving, onSave }: MemberPhoneInlineProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(phone ?? "");

  const startEdit = () => {
    setValue(phone ?? "");
    setEditing(true);
  };

  const save = () => {
    onSave(value.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="mt-0.5 flex items-center gap-1">
        <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="+5511999998888"
          autoFocus
          className="h-6 w-44 rounded-md px-2 text-xs"
        />
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={save} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
      <Phone className="h-3 w-3 shrink-0" />
      {phone ? (
        <span>{phone}</span>
      ) : (
        <span className="italic">Sem telefone (WhatsApp de tarefas desativado)</span>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={startEdit}
          className="ml-1 text-muted-foreground/60 hover:text-primary"
          aria-label="Editar telefone"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
