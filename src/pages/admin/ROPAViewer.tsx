import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Row = Record<string, string>;

/**
 * ROPA Viewer — visualiza o template CSV de Registro de Operacoes de Tratamento
 * (LGPD art. 37) servido em /ropa-fisioflow.csv. Permite busca, filtro por area,
 * download e drill-down em cada atividade.
 */
function parseCSV(text: string): Row[] {
  const rows: Row[] = [];
  const lines: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cur.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (field !== "" || cur.length > 0) {
        cur.push(field);
        lines.push(cur);
        cur = [];
        field = "";
      }
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      field += ch;
    }
  }
  if (field !== "" || cur.length > 0) {
    cur.push(field);
    lines.push(cur);
  }

  if (lines.length === 0) return rows;
  const headers = lines[0]!;
  for (let i = 1; i < lines.length; i++) {
    const r: Row = {};
    headers.forEach((h, idx) => {
      r[h] = lines[i]![idx] ?? "";
    });
    rows.push(r);
  }
  return rows;
}

export default function ROPAViewer() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Row | null>(null);

  useEffect(() => {
    fetch("/ropa-fisioflow.csv")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        setRows(parseCSV(text));
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, []);

  const areas = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.area_responsavel ?? ""));
    return ["all", ...Array.from(set).filter(Boolean).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return rows.filter((r) => {
      if (areaFilter !== "all" && r.area_responsavel !== areaFilter) return false;
      if (!ql) return true;
      return Object.values(r).some((v) => v.toLowerCase().includes(ql));
    });
  }, [rows, q, areaFilter]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              ROPA — Registro de Operações de Tratamento
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              LGPD art. 37 · Activity Fisioterapia · {rows.length} atividades mapeadas
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/ropa-fisioflow.csv" download="ropa-activity-fisioterapia.csv">
              <Download className="w-4 h-4 mr-2" /> Baixar CSV
            </a>
          </Button>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sobre este registro</CardTitle>
            <CardDescription>
              Inventário de todas as atividades da clínica que processam dados pessoais. Exigido
              pela LGPD art. 37 e modelo aderente à Nota Técnica ANPD 33/2022. Importe o CSV no
              Google Sheets para edição colaborativa. Revise a cada 6-12 meses.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por atividade, dado, base legal…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a === "all" ? "Todas as áreas" : a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p className="text-sm text-slate-500">Carregando…</p>}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6 text-sm text-red-700 dark:text-red-300">
              Erro ao carregar CSV: {error}
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-900 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left w-12">#</th>
                    <th className="px-3 py-2 text-left">Atividade</th>
                    <th className="px-3 py-2 text-left">Área</th>
                    <th className="px-3 py-2 text-left">Base legal</th>
                    <th className="px-3 py-2 text-left">Retenção</th>
                    <th className="px-3 py-2 text-left">Sensíveis?</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const hasSensitive =
                      r.dados_sensiveis &&
                      r.dados_sensiveis.toLowerCase() !== "não" &&
                      r.dados_sensiveis.toLowerCase() !== "nao" &&
                      !r.dados_sensiveis.toLowerCase().startsWith("não diretamente");
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className="border-t border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer"
                      >
                        <td className="px-3 py-3 font-mono text-xs text-slate-400">{r.id}</td>
                        <td className="px-3 py-3 font-medium">{r.atividade}</td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                          {r.area_responsavel}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {r.base_legal}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {r.retencao}
                        </td>
                        <td className="px-3 py-3">
                          {hasSensitive ? (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
                              SENSÍVEL
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              padrão
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-12 text-center text-slate-400 text-sm">
                        Nenhuma atividade encontrada com este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">#{selected.id}</span>
                    {selected.atividade}
                  </DialogTitle>
                  <DialogDescription>{selected.area_responsavel}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm pt-2">
                  {[
                    ["Controlador", "controlador"],
                    ["Operador / Terceiros", "operador_terceiro"],
                    ["Finalidade", "finalidade"],
                    ["Base legal", "base_legal"],
                    ["Categorias de titulares", "titulares"],
                    ["Dados pessoais tratados", "dados_pessoais"],
                    ["Dados sensíveis", "dados_sensiveis"],
                    ["Fonte dos dados", "fonte_dados"],
                    ["Compartilhamento externo", "compartilhamento_externo"],
                    ["Transferência internacional", "transferencia_internacional"],
                    ["Prazo de retenção", "retencao"],
                    ["Critério de descarte", "criterio_descarte"],
                    ["Medidas de segurança", "medidas_seguranca"],
                    ["Responsável interno", "responsavel_interno"],
                    ["Contato DPO", "dpo_contato"],
                    ["Última revisão", "ultima_revisao"],
                    ["Próxima revisão", "proxima_revisao"],
                  ].map(([label, key]) => (
                    <div
                      key={key}
                      className="border-b border-slate-100 dark:border-slate-800 pb-2"
                    >
                      <div className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                        {label}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 mt-1">
                        {selected[key!] || <span className="text-slate-400 italic">vazio</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
