import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Library, Search, Sparkles, Loader2, ExternalLink, FileText } from "lucide-react";
import { useAiSearch, type AiSource } from "@/hooks/useAiSearch";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

export const RagSearchWidget: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [sources, setSources] = useState<AiSource[]>([]);
  const { search, loading } = useAiSearch();

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    try {
      const response = await search(query);
      setResult(response?.response || "Nenhuma informação encontrada na base de conhecimento.");
      setSources(response?.data || []);
    } catch {
      setResult("Erro ao consultar a base de conhecimento. Tente novamente.");
      setSources([]);
    }
  };

  return (
    <Card className="rounded-[3.5rem] border-none shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-white dark:bg-slate-950 overflow-hidden relative group h-full flex flex-col">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
        <Library className="h-32 w-32 text-primary" />
      </div>

      <CardHeader className="p-10 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">
              FisioAI Suite
            </p>
            <CardTitle className="font-display text-2xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
              Knowledge Base (RAG)
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 text-slate-400 hover:text-primary transition-colors"
            onClick={() => navigate("/smart-ai")}
            title="Abrir Smart AI completo"
          >
            <ExternalLink className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-10 pb-10 flex-1 flex flex-col gap-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Consulte protocolos, artigos e exercícios..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-primary/20 text-sm font-medium"
            />
          </div>
          <Button
            type="submit"
            disabled={!query.trim() || loading}
            className="h-11 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg transition-all"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>

        <div className="flex-1 min-h-[140px] relative rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 p-6 overflow-hidden border border-slate-100 dark:border-slate-800">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full gap-3 text-primary/40"
              >
                <Sparkles className="h-10 w-10 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">
                  Consultando I.A. Clínica...
                </p>
              </motion.div>
            ) : result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full"
              >
                <ScrollArea className="h-full pr-4">
                  <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pb-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>

                    {sources.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                          <FileText className="h-3 w-3" />
                          Fontes Consultadas
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sources.map((source, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="bg-white dark:bg-slate-800 text-[10px] py-1 px-2 font-bold text-slate-500 border-none"
                            >
                              {source.filename} ({(source.score * 100).toFixed(0)}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 opacity-30">
                <Library className="h-12 w-12 mb-1" />
                <p className="text-[10px] font-bold uppercase tracking-widest max-w-[200px]">
                  Sua base de conhecimento conectada via RAG.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {result && !loading && (
          <div className="flex gap-2 mt-auto">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary h-10 rounded-xl"
              onClick={() => {
                setQuery("");
                setResult(null);
                setSources([]);
              }}
            >
              Limpar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-[10px] font-black uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 h-10 rounded-xl"
              onClick={() =>
                navigate("/smart-ai", {
                  state: { initialQuery: query, initialResult: result, initialSources: sources },
                })
              }
            >
              Continuar no Smart AI
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
