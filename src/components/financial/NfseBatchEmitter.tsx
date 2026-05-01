import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getWorkersApiUrl } from "@/lib/api/config";
import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { toLocalYMD } from "@/lib/date-utils";

interface SessionPreview {
  id: string;
  patient_name: string;
  date: string;
}

async function nfseRequest(path: string, body: object) {
  const token = await getNeonAccessToken();
  const res = await fetch(`${getWorkersApiUrl()}/api/nfse${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? "Erro na requisição");
  }
  return res.json();
}

export function NfseBatchEmitter() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [startDate, setStartDate] = useState(toLocalYMD(firstOfMonth));
  const [endDate, setEndDate] = useState(toLocalYMD(now));
  const [preview, setPreview] = useState<SessionPreview[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [emitting, setEmitting] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const res = await nfseRequest("/batch", { start_date: startDate, end_date: endDate, dry_run: true });
      setPreview(res.data.sessions ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao buscar sessões");
    } finally {
      setLoading(false);
    }
  };

  const handleEmit = async () => {
    if (!preview?.length) return;
    setEmitting(true);
    try {
      const res = await nfseRequest("/batch", { start_date: startDate, end_date: endDate });
      toast.success(`${res.data.queued} NFS-e enfileiradas para emissão.`);
      setPreview(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao emitir em lote");
    } finally {
      setEmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Emissão em Lote de NFS-e
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-36">
            <Label className="text-xs">Data inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading || emitting}
            />
          </div>
          <div className="flex-1 min-w-36">
            <Label className="text-xs">Data final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading || emitting}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={handlePreview} disabled={loading || emitting}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Verificar
            </Button>
          </div>
        </div>

        {preview !== null && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {preview.length === 0
                  ? "Nenhuma sessão sem NFS-e no período."
                  : `${preview.length} sessão${preview.length > 1 ? "ões" : ""} sem NFS-e`}
              </p>
              {preview.length > 0 && (
                <Button onClick={handleEmit} disabled={emitting}>
                  {emitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Emitir {preview.length} NFS-e
                </Button>
              )}
            </div>
            {preview.length > 0 && (
              <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                {preview.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {s.date}
                    </Badge>
                    <span>{s.patient_name || "Paciente"}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
