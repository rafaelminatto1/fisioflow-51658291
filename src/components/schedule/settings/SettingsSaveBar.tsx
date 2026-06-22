import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TabSaveHandle } from "./types";

export function SettingsSaveBar({ handle }: { handle: TabSaveHandle | null }) {
  if (!handle || !handle.isDirty) return null;
  return (
    <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-5 py-3 shadow-sm dark:border-blue-900 dark:bg-slate-950">
      <span className="text-sm text-muted-foreground">Alterações não salvas</span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handle.discard} disabled={handle.isSaving}>
          Descartar
        </Button>
        <Button
          size="sm"
          onClick={handle.save}
          disabled={handle.isSaving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {handle.isSaving ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-2 h-3.5 w-3.5" />
          )}
          {handle.isSaving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
