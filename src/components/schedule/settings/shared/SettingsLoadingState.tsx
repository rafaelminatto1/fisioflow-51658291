import { Loader2 } from "lucide-react";

interface SettingsLoadingStateProps {
  message?: string;
}

export function SettingsLoadingState({ message = "Carregando..." }: SettingsLoadingStateProps) {
  return (
    <div className="py-12 flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
