import React, { useState } from 'react';
import { PanelLeft, PanelRight, ArrowLeft, Bot, Highlighter, FileText, ChevronDown, MessageSquare, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeService } from '@/features/wiki/services/knowledgeService';
import type { KnowledgeArtifact } from '@/features/wiki/types/knowledge';
import { Document, Page, pdfjs } from 'react-pdf';
import { aiService } from '@/features/wiki/services/aiService';

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface StudyModeProps {
  artifact: KnowledgeArtifact | null;
  onClose: () => void;
}

export function StudyMode({ artifact, onClose }: StudyModeProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: "Olá! Sou seu assistente clínico. Posso ajudar a extrair protocolos, resumir evidências ou encontrar dados específicos neste documento. O que você precisa?" }
  ]);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // PDF State
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);

  if (!artifact) return null;

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleSendMessage = async () => {
    if (!query.trim()) return;
    
    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuery('');
    setIsProcessing(true);

    try {
      // Call Real Backend RAG
      const response = await aiService.askArtifact(artifact.id, userMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      // Fallback for demo/offline
      console.warn("Backend AI failed, using fallback mock for demo purposes.");
      
      setTimeout(() => {
        let response = "O backend de IA não está acessível no momento (Cloud Functions não deployadas localmente).";
        
        // Simple keyword matching for demo feel
        if (userMsg.toLowerCase().includes('resumo')) {
           response = `**Resumo (Modo Demo):**\nEste documento trata de ${artifact.title}. \n\n*Nota: Para respostas reais, faça o deploy das Cloud Functions.*`;
        }
        
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }, 1000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col h-screen w-screen overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold truncate max-w-[300px] md:max-w-[500px]">
              {artifact.title}
            </h1>
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              {artifact.evidenceLevel} • {artifact.metadata.year} • {artifact.metadata.journal || 'Journal N/A'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="hidden md:flex">
            <Highlighter className="h-4 w-4 mr-2" />
            Anotar
          </Button>
          <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Bot className="h-4 w-4 mr-2" />
            Perguntar à IA
          </Button>
        </div>
      </header>

      {/* Main Content - Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - PDF Viewer */}
        <div className="flex-1 bg-slate-100/50 relative border-r flex flex-col overflow-hidden">
            {/* PDF Toolbar */}
            <div className="h-10 bg-white border-b flex items-center justify-center gap-4 px-4 shrink-0">
                <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))} disabled={pageNumber <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium w-16 text-center">{pageNumber} / {numPages || '-'}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))} disabled={pageNumber >= numPages}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(prev => Math.max(prev - 0.1, 0.5))}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(prev => Math.min(prev + 0.1, 2.5))}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* PDF Canvas */}
          <div className="flex-1 overflow-auto bg-slate-200/50 p-8 flex justify-center">
             {artifact.url ? (
                 <Document
                    file={artifact.url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                            <p className="text-sm text-muted-foreground">Carregando documento...</p>
                        </div>
                    }
                    error={
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <FileText className="h-12 w-12 text-red-400 mb-4" />
                            <p className="text-red-500 font-medium">Erro ao carregar PDF</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Verifique se o arquivo existe ou se você tem permissão de acesso.
                            </p>
                            <p className="text-xs text-slate-400 mt-4 break-all max-w-md">{artifact.url}</p>
                        </div>
                    }
                 >
                    <Page 
                        pageNumber={pageNumber} 
                        scale={scale} 
                        className="shadow-lg mb-4"
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                    />
                 </Document>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                  <FileText className="h-16 w-16 mb-4 opacity-20" />
                  <p>Nenhum arquivo PDF associado a este artigo.</p>
                </div>
             )}
          </div>
        </div>

        {/* Right Pane - AI Chat / Notes */}
        <div className="w-[400px] flex flex-col bg-background border-l shadow-xl z-10 shrink-0">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chat' 
                  ? 'border-emerald-600 text-emerald-600' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Chat com o Documento
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'notes' 
                  ? 'border-emerald-600 text-emerald-600' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Minhas Notas
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'chat' ? (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                          msg.role === 'user' 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-100 text-slate-800 border'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 rounded-lg p-3 border flex items-center gap-2">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t bg-background">
                  <div className="relative">
                    <Input 
                      placeholder="Pergunte sobre o documento..." 
                      className="pr-10"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={handleSendMessage}
                      disabled={!query.trim() || isProcessing}
                    >
                      <ArrowLeft className="h-4 w-4 rotate-90" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    A IA pode cometer erros. Verifique as informações importantes no documento original.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 p-4">
                <textarea 
                  className="w-full h-full resize-none bg-transparent border-none focus:ring-0 text-sm p-2 placeholder:text-muted-foreground"
                  placeholder="Comece a digitar suas anotações aqui..."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
