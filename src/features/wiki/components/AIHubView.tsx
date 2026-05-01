import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Activity,
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
  X,
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

// ─── Source badge config ────────────────────────────────────────────────────
const SOURCE_BADGES: Record<string, { label: string; className: string; Icon: React.FC<any> }> = {
  paper: {
    label: "Artigo",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    Icon: BookOpen,
  },
  wiki: {
    label: "Wiki",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Icon: ScrollText,
  },
  protocol: {
    label: "Protocolo",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    Icon: FlaskConical,
  },
  exercise: {
    label: "Exercício",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
  { value: "", label: "Todas as áreas" },
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
  const [areaFilter, setAreaFilter] = useState("");
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
      if (areaFilter) params.append("area", areaFilter);

      const res = await fetch(`${getWorkersApiUrl()}/api/fisiobrain/search?${params}`);
      const data: FisioBrainResult = await res.json();
      setResult(data);
      setHistory((prev) => [{ query: query.trim(), result: data, timestamp: new Date() }, ...prev].slice(0, 10));
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
      <div className="lg:col-span-2 space-y-4">
        {/* Campo de busca */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-400">
              <Brain className="h-4 w-4" />
              FisioBrain — Busca por evidência clínica
            </div>

            <Textarea
              ref={inputRef}
              placeholder="Ex: Quais exercícios são recomendados para lombalgia crônica não específica?"
              className="min-h-[80px] resize-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1 flex-1 min-w-[120px]">
                <Label className="text-xs">Fonte</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_FILTERS.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="text-xs">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-[120px]">
                <Label className="text-xs">Área clínica</Label>
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas as áreas" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS_CLINICAS.map((a) => (
                      <SelectItem key={a.value} value={a.value} className="text-xs">
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSearch}
                disabled={loading || query.trim().length < 3}
                className="gap-2 h-8"
                size="sm"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {loading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {result ? (
          <div className="space-y-4">
            {!result.configured && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">FisioBrain não configurado</p>
                    <p className="text-xs text-muted-foreground mt-1">{result.answer}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {result.configured && (
              <Card className="border-violet-100 dark:border-violet-900/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <CardTitle className="text-sm">Resposta do FisioBrain</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</p>
                </CardContent>
              </Card>
            )}

            {result.sources.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Fontes ({result.sources.length})
                </p>
                {result.sources.map((source) => {
                  const badge = SOURCE_BADGES[source.source] ?? SOURCE_BADGES.wiki;
                  const Icon = badge.Icon;
                  return (
                    <Card key={source.id} className="border border-slate-100 dark:border-slate-800">
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium line-clamp-1">{source.title}</p>
                          <Badge className={`shrink-0 text-[10px] gap-1 ${badge.className}`}>
                            <Icon className="h-2.5 w-2.5" />
                            {badge.label}
                          </Badge>
                        </div>
                        {source.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {source.excerpt}
                          </p>
                        )}
                        {source.score != null && (
                          <p className="text-[10px] text-muted-foreground">
                            Relevância: {(source.score * 100).toFixed(0)}%
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium">Faça uma pergunta clínica ao FisioBrain</p>
            <p className="text-sm mt-1 max-w-sm">
              O FisioBrain busca em artigos científicos, protocolos, exercícios e páginas Wiki
              indexadas.
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
                className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group"
              >
                <p className="text-xs font-medium line-clamp-2 group-hover:text-violet-600 transition-colors">
                  {item.query}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {item.result.sources.length} fonte(s) •{" "}
                  {item.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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
      <header className="flex items-center gap-3">
        <div className="p-2 bg-violet-100 rounded-xl">
          <Brain className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">FisioBrain + AI Hub</h2>
          <p className="text-muted-foreground">
            Base de conhecimento clínico com IA e ferramentas de revisão.
          </p>
        </div>
      </header>

      <Tabs defaultValue="fisiobrain" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto w-fit">
          <TabsTrigger value="fisiobrain" className="gap-2">
            <Brain className="h-4 w-4" /> FisioBrain
          </TabsTrigger>
          <TabsTrigger value="soap" className="gap-2">
            <Stethoscope className="h-4 w-4" /> SOAP Review
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Simulator
          </TabsTrigger>
          <TabsTrigger value="artigos" className="gap-2">
            <FileText className="h-4 w-4" /> Artigos Científicos
          </TabsTrigger>
        </TabsList>

        {/* FisioBrain */}
        <TabsContent value="fisiobrain" className="mt-6">
          <FisioBrainChat />
        </TabsContent>

        {/* SOAP Review */}
        <TabsContent value="soap" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revisor de Notas SOAP</CardTitle>
                <CardDescription>
                  Otimize sua documentação clínica com feedback em tempo real.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Rascunho da Nota</Label>
                  <Textarea
                    placeholder="Ex: Paciente relata dor 5/10 no joelho. Realizado exercícios de fortalecimento..."
                    className="min-h-[200px]"
                    value={soapText}
                    onChange={(e) => setSoapText(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={handleSoapReview}
                  disabled={loadingSoap || !soapText.trim()}
                >
                  {loadingSoap ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Analisar Nota
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {soapResult ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Resultado da Análise</CardTitle>
                      <Badge variant={soapResult.score > 70 ? "default" : "destructive"}>
                        Score: {soapResult.score}/100
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-1">
                      {soapResult.suggestions?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                    {soapResult.improvedText && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase">Versão Aprimorada (IA)</Label>
                        <div className="p-3 bg-background border rounded-lg text-sm italic">
                          {soapResult.improvedText}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mb-4 opacity-20" />
                  <p>Insira uma nota SOAP para ver a análise do agente.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Simulator */}
        <TabsContent value="simulator" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Simulador de Paciente</CardTitle>
                <CardDescription>
                  Teste seu AI Tutor contra diferentes perfis de pacientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Última mensagem do Tutor</Label>
                  <Textarea
                    value={tutorMessage}
                    onChange={(e) => setTutorMessage(e.target.value)}
                    className="h-20 bg-blue-50/30 border-blue-100"
                  />
                </div>
                <Button
                  className="w-full gap-2"
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
                <Card className="border-emerald-200 bg-emerald-50/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Paciente Simulado</CardTitle>
                      {simResult.safetyTriggered && (
                        <Badge variant="destructive" className="animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Risco Detectado
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-background border-l-4 border-emerald-500 rounded-r-lg">
                      <p className="text-sm font-medium">"{simResult.simulatedMessage}"</p>
                    </div>
                    {simResult.internalThoughtProcess && (
                      <p className="text-xs text-slate-600 bg-white/50 p-3 rounded border italic">
                        {simResult.internalThoughtProcess}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p>Configure o perfil e clique em simular.</p>
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
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
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
        setUploadResult({ success: true, message: data.message || "Artigo indexado com sucesso no FisioBrain!" });
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold mb-1">Artigos Científicos</h3>
        <p className="text-sm text-muted-foreground">
          Faça upload de artigos em PDF para indexar na base de conhecimento do FisioBrain.
          Após indexado, o conteúdo estará disponível nas buscas do FisioBrain Chat.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            {file ? (
              <div className="space-y-1">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium text-sm">Clique para selecionar um PDF</p>
                <p className="text-xs text-muted-foreground">Artigos científicos, guias clínicos, protocolos</p>
              </div>
            )}
          </div>

          {uploadResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${uploadResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {uploadResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              {uploadResult.message}
            </div>
          )}

          <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Indexando...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Indexar Artigo no FisioBrain</>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Máx. 10MB por arquivo. Formatos aceitos: PDF</p>
        <p>• O processamento pode levar alguns segundos</p>
        <p>• Após indexado, o artigo aparece como fonte nas buscas do FisioBrain</p>
      </div>
    </div>
  );
}
