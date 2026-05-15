import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  dataCaixa: string;
  setDataCaixa: (data: string) => void;
  caixaDiario?: {
    entradas: number;
    saidas: number;
    saldo: number;
    porFormaPagamento: Record<string, number>;
  };
}

export function CaixaDiarioView({ dataCaixa, setDataCaixa, caixaDiario }: Props) {
  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            Data do Caixa:
          </span>
          <input
            type="date"
            value={dataCaixa}
            onChange={(e) => setDataCaixa(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-bold text-sm outline-none focus:ring-2 ring-primary/20"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Entradas do Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">
              R${" "}
              {(caixaDiario?.entradas || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Saídas do Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-600">
              R${" "}
              {(caixaDiario?.saidas || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Saldo Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-black ${(caixaDiario?.saldo || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              R${" "}
              {(caixaDiario?.saldo || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {caixaDiario?.porFormaPagamento && Object.keys(caixaDiario.porFormaPagamento).length > 0 && (
        <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">
              Por Meio de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(caixaDiario.porFormaPagamento).map(([forma, valor]) => (
                <div
                  key={forma}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    {forma}
                  </p>
                  <p
                    className={`text-lg font-black ${valor >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    R$ {valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
