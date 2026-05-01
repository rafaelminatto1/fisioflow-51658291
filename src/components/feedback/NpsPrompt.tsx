import { useState } from "react";
import { toast } from "sonner";
import { Star, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkersApiUrl } from "@/lib/api/config";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganizations";

interface NpsPromptProps {
  open: boolean;
  onDismiss: () => void;
}

export function NpsPrompt({ open, onDismiss }: NpsPromptProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizations();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (score === null) return;
    setSaving(true);
    try {
      await fetch(`${getWorkersApiUrl()}/api/satisfaction-surveys/nps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrganization?.id,
          user_id: user?.uid,
          score,
          comment: comment.trim() || undefined,
        }),
      });
      setSubmitted(true);
      setTimeout(onDismiss, 2500);
    } catch {
      toast.error("Erro ao enviar avaliação.");
    } finally {
      setSaving(false);
    }
  };

  const scoreLabel = (s: number) => {
    if (s <= 3) return "Muito ruim";
    if (s <= 5) return "Ruim";
    if (s <= 7) return "Regular";
    if (s <= 8) return "Bom";
    return "Excelente";
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">
      <Card className="shadow-lg border">
        <CardHeader className="flex flex-row items-start justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">
            {submitted ? "Obrigado pelo feedback! 🎉" : "Como está sua experiência?"}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        {!submitted ? (
          <CardContent className="px-4 pb-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              De 0 a 10, o quanto você recomendaria o FisioFlow para um colega?
            </p>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setScore(i)}
                  className={`h-8 w-8 rounded text-xs font-bold transition-colors ${
                    score === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-primary/20"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            {score !== null && (
              <p className="text-xs text-muted-foreground italic">{scoreLabel(score)}</p>
            )}
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comentário opcional..."
              rows={2}
              className="text-xs resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                Depois
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={score === null || saving}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Enviar
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="px-4 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              Sua opinião nos ajuda a melhorar o FisioFlow.
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
