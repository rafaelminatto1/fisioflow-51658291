import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Download, Copy } from 'lucide-react';
import VideoComposer from './VideoComposer';
import { checkMarketingConsent, createMarketingExportRecord, generateSocialCaption } from '@/services/marketing/marketingService';

interface MarketingExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrlA: string;
    videoUrlB: string;
    metrics: { label: string; valueA: number; valueB: number }[];
    patientId: string;
    patientName: string;
}

const MarketingExportModal: React.FC<MarketingExportModalProps> = ({
    isOpen, onClose, videoUrlA, videoUrlB, metrics, patientId, patientName
}) => {
    const { toast } = useToast();

    // State
    const [hasConsent, setHasConsent] = useState<boolean | null>(null);
    const [isAnonymized, setIsAnonymized] = useState(true);
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
    const [captionType, setCaptionType] = useState<'technical' | 'motivational' | 'educational'>('technical');
    const [generatedCaption, setGeneratedCaption] = useState('');
    const [exportUrl, setExportUrl] = useState<string | null>(null);

    // 1. Check Consent on Open
    useEffect(() => {
        if (isOpen) {
            checkMarketingConsent(patientId).then(allowed => {
                setHasConsent(allowed);
                if (!allowed) {
                    toast({
                        variant: "destructive",
                        title: "Consentimento Necessário",
                        description: "Este paciente não possui autorização vigente para uso de imagem em marketing."
                    });
                }
            });
            // Init default metrics
            if (metrics.length > 0) {
                setSelectedMetrics(metrics.slice(0, 3).map(m => m.label));
            }
        }
    }, [isOpen, patientId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Update Caption
    useEffect(() => {
        setGeneratedCaption(generateSocialCaption(captionType, selectedMetrics));
    }, [captionType, selectedMetrics]);


    const handleVideoGenerated = async (blob: Blob) => {
        try {
            // Create Record in DB
            const res = await createMarketingExportRecord({
                patientId,
                organizationId: 'org-123', // Mock
                assetAId: 'asset-a',
                assetBId: 'asset-b',
                metrics: selectedMetrics,
                isAnonymized
            }, blob);

            if (res.success) {
                setExportUrl(res.url);
                toast({ title: "Vídeo Pronto!", description: "Download disponível." });
            }
        } catch {
            toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível registrar o export." });
        }
    };

    if (hasConsent === false) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle /> Acesso Negado
                        </DialogTitle>
                        <DialogDescription>
                            O paciente <strong>{patientName}</strong> não possui Termo de Consentimento para Uso de Imagem (Marketing) ativo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-red-50 p-4 rounded text-sm text-red-800">
                        Para habilitar esta função, é necessário coletar a assinatura de um novo termo específico para divulgação.
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Criar Conteúdo para Redes Sociais</DialogTitle>
                    <DialogDescription>Comparativo Antes/Depois com overlay e legenda automática.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                    {/* Left: Video Composer */}
                    <div className="space-y-4">
                        <Label>Pré-visualização do Vídeo</Label>
                        <VideoComposer
                            videoUrlA={videoUrlA}
                            videoUrlB={videoUrlB}
                            isAnonymized={isAnonymized}
                            metricsOverlay={selectedMetrics}
                            onExportComplete={handleVideoGenerated}
                            watermarkText="Dr. Rafael Minatto"
                        />

                        {exportUrl && (
                            <div className="bg-green-50 p-4 rounded border border-green-200 flex justify-between items-center mt-4">
                                <span className="text-green-800 font-medium">Renderização Concluída</span>
                                <Button asChild className="bg-green-600 hover:bg-green-700">
                                    <a href={exportUrl} download={"comparativo_" + patientId + ".webm"}>
                                        <Download className="w-4 h-4 mr-2" /> Baixar Arquivo
                                    </a>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Right: Settings & Caption */}
                    <div className="space-y-6">
                        <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                            <h3 className="font-semibold text-sm">Configurações de Privacidade</h3>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="anon-mode" className="flex flex-col">
                                    <span>Anonimizar Rosto</span>
                                    <span className="text-xs text-muted-foreground">Aplica blur na região da face (automático)</span>
                                </Label>
                                <Switch id="anon-mode" checked={isAnonymized} onCheckedChange={setIsAnonymized} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Legenda Inteligente</h3>
                            <Tabs value={captionType} onValueChange={(v) => setCaptionType(v as 'technical' | 'motivational' | 'educational')}>
                                <TabsList className="w-full">
                                    <TabsTrigger value="technical" className="flex-1">Técnico</TabsTrigger>
                                    <TabsTrigger value="motivational" className="flex-1">Motivacional</TabsTrigger>
                                    <TabsTrigger value="educational" className="flex-1">Educativo</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div className="relative">
                                <Textarea
                                    value={generatedCaption}
                                    onChange={(e) => setGeneratedCaption(e.target.value)}
                                    className="h-32 text-sm pr-10"
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-2 right-2"
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedCaption);
                                        toast({ title: "Copiado!" });
                                    }}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MarketingExportModal;
