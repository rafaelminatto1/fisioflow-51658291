import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Stethoscope,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Brain,
  BookOpen,
  FlaskConical,
  ScrollText,
  Dumbbell,
  History,
  FileText,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { getWorkersApiUrl } from "@/lib/api/config";

// ─── FisioBrain Types ───────────────────────────────────────────────────────
interface FisioBrainSource {
  id: string;
  title: string;
  source: "paper" | "wiki" | "protocol" | "exercise";
  excerpt: string;
  score?: number;
}

interface FisioBrainResult {
  answer: string;
  sources: FisioBrainSource[];
  configured?: boolean;
}

interface SearchHistoryItem {
  query: string;
  result: FisioBrainResult;
  timestamp: Date;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asStringArray(value: unknown): string[] {
  return asArray(value).map(String).filter(Boolean);
}

function normalizeFisioBrainResult(value: unknown): FisioBrainResult {
  const raw = value && typeof value === "object" ? (value as Partial<FisioBrainResult>) : {};

  return {
    answer: typeof raw.answer === "string" ? raw.answer : "",
    sources: asArray<FisioBrainSource>(raw.sources),
    configured: raw.configured,
  };
}

// ─── Source badge config ────────────────────────────────────────────────────
const SOURCE_BADGES: Record<string, { label: string; className: string; Icon: React.FC<any> }> = {
  paper: {
    label: "Artigo",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Icon: BookOpen,
  },
  wiki: {
    label: "Wiki",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Icon: ScrollText,
  },
  protocol: {
    label: "Protocolo",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Icon: FlaskConical,
  },
  exercise: {
    label: "Exercício",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    Icon: Dumbbell,
  },
};

const SOURCE_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "paper", label: "Artigos" },
  { value: "wiki", label: "Wiki" },
  { value: "protocol", label: "Protocolos" },
  { value: "exercise", label: "Exercícios" },
];

const AREAS_CLINICAS = [
  { value: "all", label: "Todas as áreas" },
  { value: "Ortopedia", label: "Ortopedia" },
  { value: "Neurologia", label: "Neurologia" },
  { value: "Respiratória", label: "Respiratória" },
  { value: "Esportiva", label: "Esportiva" },
  { value: "Geriatria", label: "Geriatria" },
  { value: "Reumatologia", label: "Reumatologia" },
];

// ─── FisioBrain Chat ─────────────────────────────────────────────────────────
function FisioBrainChat() {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FisioBrainResult | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleSearch() {
    if (!query.trim() || query.trim().length < 3) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (sourceFilter !== "all") params.append("source", sourceFilter);
      if (areaFilter && areaFilter !== "all") params.append("area", areaFilter);

      const res = await fetch(`${getWorkersApiUrl()}/api/fisiobrain/search?${params}`);
      const data = normalizeFisioBrainResult(await res.json());
      setResult(data);
      setHistory((prev) =>
        [{ query: query.trim(), result: data, timestamp: new Date() }, ...prev].slice(0, 10),
      );
    } catch {
      toast.error("Erro ao consultar o FisioBrain.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  }

  function loadFromHistory(item: SearchHistoryItem) {
    setQuery(item.query);
    setResult(item.result);
    inputRef.current?.focus();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Painel principal */}
      <div className="lg:col-span-2 space-y-6">
        {/* Campo de busca */}
        <Card className="bg-slate-50/50 border-slate-200/60 rounded-2xl shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600">
              <Brain className="h-4 w-4" />
              FisioBrain — Busca por evidência clínica
            </div>

            <Textarea
              ref={inputRef}
              placeholder="Ex: Quais exercícios são recomendados para lombalgia crônica não específica?"
              className="min-h-[100px] resize-none rounded-xl border-slate-200 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-medium"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fonte</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                    {SOURCE_FILTERS.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="text-xs rounded-lg">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Área clínica</Label>
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-white border-slate-200">
                    <SelectValue placeholder="Todas as áreas" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                    {AREAS_CLINICAS.map((a) => (
                      <SelectItem key={a.value} value={a.value} className="text-xs rounded-lg">
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSearch}
                disabled={loading || query.trim().length < 3}
                className="gap-2 h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {loading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {result ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {!result.configured && (
              <Card className="border-orange-200 bg-orange-50/50 rounded-2xl shadow-sm">
                <CardContent className="p-6 flex items-start gap-4">
                  <AlertTriangle className="h-6 w-6 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">FisioBrain não configurado</p>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed font-medium">{result.answer}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {result.configured && (
              <Card className="bg-white border-blue-100 rounded-2xl shadow-md overflow-hidden">
                <CardHeader className="pb-3 border-b border-blue-50 bg-blue-50/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
                    <CardTitle className="text-base font-bold font-display text-blue-900">Resposta do FisioBrain</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 p-6">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 font-medium">{result.answer}</p>
                </CardContent>
              </Card>
            )}

            {result.sources.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Fontes Identificadas ({result.sources.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.sources.map((source) => {
                    const badge = SOURCE_BADGES[source.source] ?? SOURCE_BADGES.wiki;
                    const Icon = badge.Icon;
                    return (
                      <Card key={source.id} className="bg-slate-50/30 border-slate-200/60 rounded-xl hover:shadow-md transition-all cursor-pointer group/source">
                        <CardContent className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-bold text-slate-900 group-hover/source:text-blue-600 transition-colors line-clamp-1">{source.title}</p>
                            <Badge className={cn("shrink-0 text-[9px] font-black uppercase tracking-wider gap-1 rounded-md border-transparent", badge.className)}>
                              <Icon className="h-2.5 w-2.5" />
                              {badge.label}
                            </Badge>
                          </div>
                          {source.excerpt && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium italic">
                              "{source.excerpt}"
                            </p>
                          )}
                          {source.score != null && (
                            <div className="pt-1 flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                Relevância
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${source.score * 100}%` }} />
                                </div>
                                <span className="text-[10px] font-black text-blue-600">{(source.score * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400 bg-slate-50/20">
            <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-blue-400/10 animate-ping" />
              <Brain className="h-10 w-10 text-blue-400 relative z-10" />
            </div>
            <p className="font-bold text-slate-600 font-display text-lg">Faça uma pergunta clínica ao FisioBrain</p>
            <p className="text-sm mt-2 max-w-sm font-medium">
              O FisioBrain busca em artigos científicos, protocolos, exercícios e páginas Wiki
              indexadas para fornecer a melhor evidência.
            </p>
          </div>
        )}
      </div>

      {/* Histórico da sessão */}
      <aside className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          <History className="h-3.5 w-3.5" />
          Histórico da Sessão
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma busca ainda.</p>
        ) : (
          <div className="space-y-2">
            {history.map((item, i) => (
              <button
                key={i}
                onClick={() => loadFromHistory(item)}
                className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group"
              >
                <p className="text-xs font-medium line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {item.query}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {item.result.sources.length} fonte(s) •{" "}
                  {item.timestamp.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function AIHubView() {
  const [soapText, setSoapText] = useState("");
  const [soapResult, setSoapResult] = useState<any>(null);
  const [loadingSoap, setLoadingSoap] = useState(false);

  const [simulatorProfile] = useState({
    age: 45,
    condition: "Pós-operatório de LCA (3 semanas)",
    painLevel: 4,
    motivationLevel: "medium",
    personaTraits: ["ansioso", "focado na recuperação"],
  });
  const [simResult, setSimResult] = useState<any>(null);
  const [loadingSim, setLoadingSim] = useState(false);
  const [tutorMessage, setTutorMessage] = useState(
    "Olá! Como você está se sentindo hoje com seus exercícios?",
  );

  const handleSoapReview = async () => {
    if (!soapText.trim()) return;
    setLoadingSoap(true);
    try {
      const res = await fetch(`${getWorkersApiUrl()}/api/agents/soap-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: soapText }),
      });
      const { data } = await res.json();
      setSoapResult(data);
      toast.success("Análise SOAP concluída!");
    } catch {
      toast.error("Erro ao revisar nota SOAP.");
    } finally {
      setLoadingSoap(false);
    }
  };

  const handleSimulation = async () => {
    setLoadingSim(true);
    try {
      const res = await fetch(`${getWorkersApiUrl()}/api/agents/simulator/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: simulatorProfile,
          chatHistory: [],
          agentLastMessage: tutorMessage,
        }),
      });
      const { data } = await res.json();
      setSimResult(data);
      toast.success("Simulação gerada!");
    } catch {
      toast.error("Erro ao gerar simulação.");
    } finally {
      setLoadingSim(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="p-3 bg-blue-100 rounded-2xl shadow-sm">
          <Brain className="h-7 w-7 text-blue-600" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-display">FisioBrain Intelligence Hub</h2>
          <p className="text-slate-500 font-medium">
            Sua base de inteligência clínica amplificada por IA regenerativa.
          </p>
        </div>
      </header>

      <Tabs defaultValue="fisiobrain" className="w-full">
        <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl h-auto w-fit mb-8 border border-slate-200/50">
          <TabsTrigger value="fisiobrain" className="gap-2 rounded-xl px-5 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all">
            <Brain className="h-4 w-4" /> FisioBrain
          </TabsTrigger>
          <TabsTrigger value="soap" className="gap-2 rounded-xl px-5 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all">
            <Stethoscope className="h-4 w-4" /> SOAP Review
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2 rounded-xl px-5 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all">
            <MessageSquare className="h-4 w-4" /> Simulator
          </TabsTrigger>
          <TabsTrigger value="artigos" className="gap-2 rounded-xl px-5 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all">
            <FileText className="h-4 w-4" /> Artigos
          </TabsTrigger>
        </TabsList>

        {/* FisioBrain */}
        <TabsContent value="fisiobrain" className="mt-6">
          <FisioBrainChat />
        </TabsContent>

        {/* SOAP Review */}
        <TabsContent value="soap" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                <CardTitle className="text-lg font-bold font-display text-slate-900">Revisor de Notas SOAP</CardTitle>
                <CardDescription className="font-medium">
                  Otimize sua documentação clínica com feedback em tempo real da IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Rascunho da Nota</Label>
                  <Textarea
                    placeholder="Ex: Paciente relata dor 5/10 no joelho. Realizado exercícios de fortalecimento..."
                    className="min-h-[200px] rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-medium text-sm"
                    value={soapText}
                    onChange={(e) => setSoapText(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full h-12 rounded-xl gap-2 font-bold text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                  onClick={handleSoapReview}
                  disabled={loadingSoap || !soapText.trim()}
                >
                  {loadingSoap ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  Analisar Nota com IA
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {soapResult ? (
                <Card className="border-blue-200 bg-blue-50/30 rounded-2xl shadow-md overflow-hidden">
                  <CardHeader className="pb-3 border-b border-blue-100 bg-blue-100/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold font-display text-blue-900">Resultado da Análise</CardTitle>
                      <Badge 
                        variant={soapResult.score > 70 ? "default" : "destructive"}
                        className="rounded-lg font-black uppercase tracking-widest text-[10px] px-2.5 py-1"
                      >
                        Score: {soapResult.score}/100
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5 p-6">
                    <ul className="space-y-2.5">
                      {asStringArray(soapResult.suggestions).map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-700 font-medium leading-relaxed">
                          <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                    {soapResult.improvedText && (
                      <div className="space-y-2 pt-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                          Versão Aprimorada (IA)
                        </Label>
                        <div className="p-4 bg-white border border-blue-100 rounded-xl text-sm italic text-slate-600 leading-relaxed shadow-sm">
                          "{soapResult.improvedText}"
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 bg-slate-50/20">
                  <Stethoscope className="h-12 w-12 mb-4 opacity-20" />
                  <p className="font-bold text-slate-600 font-display">Insira uma nota SOAP</p>
                  <p className="text-xs mt-1 font-medium">O agente analisará clareza, objetividade e conformidade clínica.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Simulator */}
        <TabsContent value="simulator" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold font-display">Simulador de Paciente</CardTitle>
                <CardDescription className="font-medium">
                  Teste seu AI Tutor contra diferentes perfis de pacientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Última mensagem do Tutor</Label>
                  <Textarea
                    value={tutorMessage}
                    onChange={(e) => setTutorMessage(e.target.value)}
                    className="min-h-[100px] bg-slate-50/50 border-slate-200 rounded-xl resize-none font-medium text-sm"
                  />
                </div>
                <Button
                  className="w-full h-11 rounded-xl gap-2 font-bold bg-slate-900 text-white hover:bg-slate-800"
                  variant="secondary"
                  onClick={handleSimulation}
                  disabled={loadingSim}
                >
                  {loadingSim ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Simular Resposta do Paciente
                </Button>
              </CardContent>
            </Card>

            <div>
              {simResult ? (
                <Card className="border-blue-200 bg-blue-50/30 rounded-2xl shadow-md overflow-hidden">
                  <CardHeader className="pb-3 border-b border-blue-100 bg-blue-100/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold font-display text-blue-900">Paciente Simulado</CardTitle>
                      {simResult.safetyTriggered && (
                        <Badge variant="destructive" className="animate-pulse rounded-lg font-black uppercase tracking-widest text-[9px]">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Risco Detectado
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5 p-6">
                    <div className="p-5 bg-white border border-blue-100 rounded-2xl shadow-sm border-l-4 border-l-blue-600">
                      <p className="text-sm font-bold text-slate-800 leading-relaxed">"{simResult.simulatedMessage}"</p>
                    </div>
                    {simResult.internalThoughtProcess && (
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                          Processamento Interno (Persona)
                        </Label>
                        <p className="text-[11px] text-slate-500 bg-slate-100/50 p-4 rounded-xl border border-slate-200 italic leading-relaxed font-medium">
                          {simResult.internalThoughtProcess}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 bg-slate-50/20">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p className="font-bold text-slate-600 font-display">Simulação Pendente</p>
                  <p className="text-xs mt-1 font-medium">Configure o perfil e clique em simular para ver a reação do paciente.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Artigos Científicos */}
        <TabsContent value="artigos" className="mt-6">
          <ArtigosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ArtigosTab() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      setUploadResult(null);
    } else {
      toast.error("Selecione um arquivo PDF");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const token = await import("@/lib/auth/neon-token").then((m) => m.getNeonAccessToken());
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", file.name);

      const res = await fetch(`${getWorkersApiUrl()}/api/knowledge/upload-paper`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult({
          success: true,
          message: data.message || "Artigo indexado com sucesso no FisioBrain!",
        });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setUploadResult({ success: false, message: data.error || "Erro ao indexar artigo." });
      }
    } catch {
      setUploadResult({ success: false, message: "Erro de conexão." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-4">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold font-display text-slate-900">Indexação de Artigos Científicos</h3>
        <p className="text-slate-500 font-medium">
          Alimente o cérebro da clínica com evidências de alta qualidade.
        </p>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-8 space-y-6">
          <div
            className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all group/upload"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover/upload:bg-blue-100 transition-colors">
               <FileText className="h-8 w-8 text-slate-400 group-hover/upload:text-blue-600 transition-colors" />
            </div>
            {file ? (
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-base">{file.name}</p>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-bold text-slate-700 text-base">Clique para selecionar um PDF</p>
                <p className="text-xs text-slate-400 font-medium">
                  Protocolos, guias clínicos e consensos (Max 10MB)
                </p>
              </div>
            )}
          </div>

          {uploadResult && (
            <div
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl text-sm font-bold animate-in zoom-in-95 duration-300",
                uploadResult.success ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
              )}
            >
              {uploadResult.success ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0" />
              )}
              {uploadResult.message}
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || uploading} 
            className="w-full h-12 rounded-xl font-bold text-base bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Indexando Inteligência...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" /> Indexar no FisioBrain
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Processamento</p>
           <p className="text-xs text-slate-600 font-medium leading-relaxed">
             O FisioBrain utiliza embeddings vetoriais para converter o PDF em conhecimento consultável.
           </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Disponibilidade</p>
           <p className="text-xs text-slate-600 font-medium leading-relaxed">
             Uma vez indexado, o conteúdo estará disponível para toda a equipe no Chat e Resumos.
           </p>
        </div>
      </div>
    </div>
  );
}
