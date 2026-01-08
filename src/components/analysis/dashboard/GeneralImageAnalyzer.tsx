import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Brain, AlertTriangle } from 'lucide-react';
import { analyzeWithGeminiVision, VisionAnalysisResult } from '@/services/ai/geminiVisionService';
import ReactMarkdown from 'react-markdown'; // Ensure this is available or use simple display

interface GeneralImageAnalyzerProps {
    file: File;
}

const GeneralImageAnalyzer: React.FC<GeneralImageAnalyzerProps> = ({ file }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<VisionAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setImageUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const result = await analyzeWithGeminiVision(base64);
                setAnalysis(result);
                setIsAnalyzing(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Analysis failed", error);
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex h-full gap-4">
            {/* Image View */}
            <div className="flex-1 flex flex-col gap-4">
                <Card className="flex-1 bg-black flex items-center justify-center p-4 overflow-hidden relative">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Análise"
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <div className="text-slate-500">Nenhuma imagem carregada</div>
                    )}
                </Card>
            </div>

            {/* Analysis Sidebar */}
            <Card className="w-[400px] flex flex-col p-4 gap-4 bg-slate-50 border-l">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        Assistente IA
                    </h3>
                    {analysis && <span className="text-xs text-muted-foreground">{new Date(analysis.timestamp).toLocaleTimeString()}</span>}
                </div>

                <Alert variant="destructive" className="bg-orange-50 text-orange-800 border-orange-200">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertTitle>Aviso Legal</AlertTitle>
                    <AlertDescription className="text-xs">
                        Esta ferramenta é apenas para fins educacionais e de pesquisa.
                        **Não deve ser usada para diagnóstico primário.**
                    </AlertDescription>
                </Alert>

                <ScrollArea className="flex-1 border rounded-md p-4 bg-white">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                            <span>Processando imagem...</span>
                        </div>
                    ) : analysis ? (
                        <div className="prose prose-sm max-w-none">
                            {/* If ReactMarkdown is not installed, simple whitespace-pre-wrap div */}
                            <div className="whitespace-pre-wrap font-sans text-sm">
                                {analysis.text}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center">
                            Clique em "Gerar Relatório" para iniciar a análise da imagem.
                        </div>
                    )}
                </ScrollArea>

                <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !imageUrl}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                    {isAnalyzing ? "Analisando..." : "Gerar Relatório AI"}
                </Button>
            </Card>
        </div>
    );
};

export default GeneralImageAnalyzer;
