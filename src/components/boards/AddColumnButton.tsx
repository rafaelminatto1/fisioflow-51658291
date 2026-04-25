import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AddColumnButtonProps {
  onAdd: (name: string) => void;
  isLoading?: boolean;
}

export function AddColumnButton({ onAdd, isLoading }: AddColumnButtonProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
    setEditing(false);
  };

  const handleCancel = () => {
    setName("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn(
          "flex-shrink-0 w-[280px] h-12 rounded-xl border-2 border-dashed border-muted-foreground/30",
          "flex items-center justify-center gap-2 text-sm text-muted-foreground",
          "hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors",
        )}
      >
        <Plus className="h-4 w-4" />
        Adicionar coluna
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-shrink-0 w-[280px] bg-muted/30 rounded-xl p-3 flex flex-col gap-2"
    >
      <Input
        ref={inputRef}
        placeholder="Nome da coluna..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && handleCancel()}
        className="h-8 text-sm"
      />
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={!name.trim() || isLoading}
          className="h-7 px-3 text-xs"
        >
          {isLoading ? "..." : "Adicionar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCancel}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}
