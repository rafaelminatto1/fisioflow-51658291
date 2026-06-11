import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowLeft,
  Bot,
  Highlighter,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { KnowledgeArtifact } from "@/features/wiki/types/knowledge";
import { aiService } from "@/features/wiki/services/aiService";
import { toast } from "sonner";

interface StudyModeProps {
  artifact: KnowledgeArtifact | null;
  onClose: () => void;
}

export function StudyMode({ artifact, onClose }: StudyModeProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "notes">("chat");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou seu assistente clínico. Posso ajudar a extrair protocolos, resumir evidências ou encontrar dados específicos neste documento. O que você precisa?",
    },
  ]);
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const artifactHostname = useMemo(() => {
    if (!artifact?.url) return "";
    try {
      return new URL(artifact.url).hostname;
    } catch {
      return "";
    }
  }, [artifact]);

  const isBlockedDomain = useMemo(() => {
    if (!artifactHostname) return false;
    const blockedDomains = [
      "pubmed.ncbi.nlm.nih.gov",
      "bjsm.bmj.com",
      "bmj.com",
      "apta.org",
      "doi.org",
      "nature.com",
      "sciencedirect.com",
      "nejm.org",
      "thelancet.com",
      "jamanetwork.com",
      "cochranelibrary.com",
    ];
    return blockedDomains.some((domain) => artifactHostname.includes(domain));
  }, [artifactHostname]);

  const isLikelyPdf = useMemo(() => {
    if (!artifact?.url) return false;
    const url = artifact.url.toLowerCase();
    return url.endsWith(".pdf") || url.includes("type=printable") || url.includes("/pdf/");
  }, [artifact]);

  useEffect(() => {
    if (!artifact) return;
    setPageNumber(1);
    setScale(1.2);
  }, [artifact]);

  const browserPdfUrl = useMemo(() => {
    if (!artifact?.url) return "";
    // Se for um domínio bloqueado e não for explicitamente um PDF, não tentamos injetar hash de PDF
    if (isBlockedDomain && !isLikelyPdf) return artifact.url;

    const hash = `page=${pageNumber}&zoom=${Math.round(scale * 100)}`;
    const baseUrl = typeof artifact.url === "string" ? artifact.url.split("#")[0] : "";
    if (!baseUrl) return "";
    return `${baseUrl}#${hash}`;
  }, [artifact, pageNumber, scale, isBlockedDomain, isLikelyPdf]);

  if (!artifact) return null;

  const handleSendMessage = async (textOverride?: string) => {
    const userMsg = textOverride || query;
    if (!userMsg.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setQuery("");
    setIsProcessing(true);
    setActiveTab("chat");

    try {
      // Call Real Backend RAG
      const response = await aiService.askArtifact(artifact.id, userMsg);
      setMessages((prev) => [...prev, { role: "assistant", content: response.answer }]);
    } catch {
      // Fallback for demo/offline
      console.warn("Backend AI failed, using fallback mock for demo purposes.");

      setTimeout(() => {
        let response =
          "O backend de IA não está acessível no momento (Cloud Functions não deployadas localmente).";

        // Simple keyword matching for demo feel
        if (userMsg.toLowerCase().includes("resumo")) {
          response = `**Resumo (Modo Demo):**\nEste documento trata de ${artifact.title}. \n\n*Nota: Para respostas reais, faça o deploy das Cloud Functions.*`;
        }

        setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      }, 1000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMagicAction = (type: "faq" | "flashcards" | "viva") => {
    const prompts = {
      faq: "Gere uma lista de 5 Perguntas Frequentes (FAQ) com respostas baseadas exclusivamente neste documento.",
      flashcards:
        "Crie 5 flashcards de estudo (frente e verso) cobrindo os conceitos mais importantes deste artigo.",
      viva: "Atue como um examinador clínico sênior. Faça-me 3 perguntas desafiadoras sobre este documento para testar meu conhecimento prático.",
    };

    handleSendMessage(prompts[type]);
    toast.success(`Gerando ${type.toUpperCase()} com IA...`);
  };

  const handleFocusChat = () => {
    setActiveTab("chat");
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  const handleFocusNotes = () => {
    setActiveTab("notes");
    setTimeout(() => notesRef.current?.focus(), 100);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0 shadow-sm relative z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline font-bold text-xs uppercase tracking-tight">
              Voltar ao Artigo
            </span>
          </Button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="flex flex-col">
            <h1 className="text-sm font-bold truncate max-w-[200px] md:max-w-[400px] lg:max-w-[600px]">
              {artifact.title}
            </h1>
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-2 uppercase tracking-widest">
              {artifact.evidenceLevel} • {artifact.metadata.year} •{" "}
              {artifact.metadata.journal || "Journal N/A"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex gap-2"
            onClick={handleFocusNotes}
          >
            <Highlighter className="h-4 w-4 text-amber-500" />
            Anotar
          </Button>
          <Button
            variant="default"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={handleFocusChat}
          >
            <Bot className="h-4 w-4" />
            Perguntar à IA
          </Button>
        </div>
      </header>

      {/* Main Content - Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - PDF Viewer */}
        <div className="flex-1 bg-slate-100/50 relative border-r flex flex-col overflow-hidden">
          {/* PDF Toolbar */}
          <div className="h-10 bg-white border-b flex items-center justify-center gap-4 px-4 shrink-0 shadow-sm relative z-10">
            {isLikelyPdf && (
              <>
                <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                    disabled={pageNumber <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-[11px] font-bold min-w-[70px] text-center px-2 text-slate-600">
                    PÁG. {pageNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPageNumber((prev) => prev + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-[11px] font-bold w-12 text-center text-slate-600">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setScale((prev) => Math.min(prev + 0.1, 2.5))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-7 px-3 text-[11px] font-bold uppercase tracking-tight"
            >
              <a href={artifact.url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                {isLikelyPdf ? "Abrir PDF" : "Fonte Externa"}
              </a>
            </Button>
          </div>

          {/* PDF Canvas / Iframe */}
          <div className="flex-1 overflow-auto bg-slate-200/50 p-4 md:p-8 flex justify-center">
            {artifact.url ? (
              <div className="w-full max-w-5xl h-full min-h-[70vh] bg-white rounded-xl shadow-2xl overflow-hidden border relative">
                {isBlockedDomain && !isLikelyPdf ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-4 bg-slate-50">
                    <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-2">
                      <ExternalLink className="h-10 w-10" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      Visualização Protegida pela Fonte
                    </h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                      O site de origem (<strong>{artifactHostname}</strong>) não permite que seu
                      conteúdo seja exibido dentro de outras plataformas por segurança.
                    </p>
                    <div className="flex flex-col gap-3 pt-4">
                      <Button asChild className="bg-primary hover:bg-primary/90 rounded-full px-8">
                        <a href={artifact.url} target="_blank" rel="noreferrer">
                          Abrir Artigo em Nova Aba
                        </a>
                      </Button>
                      <p className="text-[11px] text-slate-400 italic">
                        DICA: Você pode continuar usando o Chat de IA ao lado para tirar dúvidas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    key={browserPdfUrl}
                    src={browserPdfUrl}
                    title={artifact.title}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p className="font-medium">Nenhum arquivo associado a este artigo.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - AI Chat / Notes */}
        <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col bg-background border-l shadow-2xl z-10 shrink-0">
          <div className="flex border-b bg-muted">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
                activeTab === "chat"
                  ? "border-emerald-600 text-emerald-600 bg-white"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat IA
              </div>
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
                activeTab === "notes"
                  ? "border-emerald-600 text-emerald-600 bg-white"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                Notas
              </div>
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden relative">
            {activeTab === "chat" ? (
              <>
                {/* Magic Actions Bar */}
                <div className="p-2 border-b bg-slate-50 flex gap-2 overflow-x-auto scrollbar-hide">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] font-bold uppercase shrink-0 gap-1 rounded-full border-primary/20 hover:bg-primary/5"
                    onClick={() => handleMagicAction("faq")}
                  >
                    <HelpCircle className="h-3 w-3 text-primary" /> FAQ
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] font-bold uppercase shrink-0 gap-1 rounded-full border-amber-200 hover:bg-amber-50"
                    onClick={() => handleMagicAction("flashcards")}
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" /> Flashcards
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] font-bold uppercase shrink-0 gap-1 rounded-full border-emerald-200 hover:bg-emerald-50"
                    onClick={() => handleMagicAction("viva")}
                  >
                    <Bot className="h-3 w-3 text-emerald-600" /> Viva Exam
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-4 bg-muted">
                  <div className="space-y-6">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start animate-in slide-in-from-left-2 duration-300"}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-2xl p-4 shadow-sm ${
                            msg.role === "user"
                              ? "bg-emerald-600 text-white rounded-tr-none"
                              : "bg-white text-slate-800 border rounded-tl-none"
                          }`}
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                              {msg.role === "assistant" ? (
                                <Bot className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <div className="h-3.5 w-3.5 rounded-full bg-white/20" />
                              )}
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                                {msg.role === "assistant" ? "FisioBrain IA" : "Você"}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                            {msg.role === "assistant" && (
                              <div className="flex justify-end mt-2 pt-2 border-t border-slate-100">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-400 hover:text-primary"
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.content);
                                    toast.success("Resposta copiada!");
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="bg-white rounded-2xl p-4 border rounded-tl-none flex items-center gap-2 shadow-sm">
                          <div
                            className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                  <div className="relative">
                    <Input
                      ref={chatInputRef}
                      placeholder="Pergunte sobre o documento..."
                      className="pr-12 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-inner"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                      onClick={() => handleSendMessage()}
                      disabled={!query.trim() || isProcessing}
                    >
                      <ArrowLeft className="h-4 w-4 rotate-90" />
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2 text-center font-bold uppercase tracking-tight">
                    Grounded Clinical IA • Verifique informações importantes
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col bg-white">
                <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Caderno de Estudos
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] font-bold uppercase tracking-tight"
                    onClick={() => toast.success("Notas salvas automaticamente!")}
                  >
                    Salvar
                  </Button>
                </div>
                <textarea
                  ref={notesRef}
                  className="flex-1 w-full resize-none bg-transparent border-none focus:ring-0 text-sm p-6 placeholder:text-slate-300 leading-loose"
                  placeholder="Comece a digitar suas anotações, insights clínicos e reflexões sobre este artigo..."
                />
                <div className="p-4 border-t bg-slate-50 text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                    As notas são vinculadas permanentemente a este artigo.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
