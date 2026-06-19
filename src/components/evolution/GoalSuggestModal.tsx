/**
 * GoalSuggestModal - Sugere metas SMART por IA a partir de avaliação/evolução em texto.
 * Read-only: o fisioterapeuta revisa e adiciona cada meta (humano no loop).
 */
import { useState } from "react";
import { Sparkles, Plus, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreateGoal } from "@/hooks/usePatientEvolution";
import { goalsApi } from "@/api/v2";

type SuggestedGoal = {
  title: string;
  category?: string;
  priority: "baixa" | "media" | "alta" | "critica";
  targetValue?: string;
  rationale?: string;
};

interface GoalSuggestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}

export function GoalSuggestModal({ open, onOpenChange, patientId }: GoalSuggestModalProps) {
  const createGoal = useCreateGoal();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedGoal[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const reset = () => {
    setText("");
    setError(null);
    setSuggestions([]);
    setAdded(new Set());
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const runSuggest = async () => {
    const t = text.trim();
    if (t.length < 10 || busy) return;
    setBusy(true);
    setError(null);
    setSuggestions([]);
    try {
      const res = await goalsApi.suggest(t);
      const list = res?.data ?? [];
      if (list.length === 0) setError("A IA não encontrou metas no texto.");
      setSuggestions(list);
    } catch (e) {
      setError((e as Error).message ?? "Falha ao sugerir metas");
    } finally {
      setBusy(false);
    }
  };

  const addSuggested = async (s: SuggestedGoal) => {
    await createGoal.mutateAsync({
      patient_id: patientId,
      goal_title: s.title,
      goal_description: s.rationale ?? "",
      category: s.category,
      target_value: s.targetValue,
      priority: s.priority,
    });
    setAdded((prev) => new Set(prev).add(s.title));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugerir metas (IA)
          </DialogTitle>
          <DialogDescription>
            Cole a avaliação ou a evolução do paciente. A IA propõe metas SMART para você revisar e
            adicionar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: Paciente com lombalgia crônica, EVA 7/10, limitação de flexão de tronco, dificuldade para sentar/levantar…"
            rows={4}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={runSuggest} disabled={busy || text.trim().length < 10} className="w-full">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando sugestões…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar sugestões
              </>
            )}
          </Button>
          {suggestions.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto pt-1">
              {suggestions.map((s, i) => {
                const isAdded = added.has(s.title);
                return (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{s.title}</p>
                        {s.targetValue && (
                          <p className="text-xs text-muted-foreground mt-0.5">Alvo: {s.targetValue}</p>
                        )}
                        {s.rationale && (
                          <p className="text-xs text-muted-foreground mt-1">{s.rationale}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {s.category && (
                            <Badge variant="outline" className="text-[10px]">
                              {s.category}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {s.priority}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isAdded ? "secondary" : "default"}
                        disabled={isAdded || createGoal.isPending}
                        onClick={() => addSuggested(s)}
                        title="Adicionar meta"
                      >
                        {isAdded ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
