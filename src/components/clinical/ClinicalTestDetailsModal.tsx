import { useEffect, useState } from 'react';
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import {
    PlayCircle,
    Info,
    ThumbsUp,
    X,
    CheckSquare,
    Image as ImageIcon,
    Edit3,
    Trash2,
    Download,
    CalendarCheck,
    ZoomIn,
} from 'lucide-react';
import { generateClinicalTestPdf } from '@/utils/generateClinicalTestPdf';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ClinicalTest {
    id: string;
    name: string;
    name_en?: string;
    category: string;
    target_joint: string;
    purpose: string;
    execution: string;
    positive_sign?: string;
    reference?: string;
    sensitivity_specificity?: string;
    tags?: string[];
    image_url?: string;
    media_urls?: string[];
    description?: string;
    fields_definition?: unknown[];
    regularity_sessions?: number | null;
    organization_id?: string | null;
}

interface ClinicalTestDetailsModalProps {
    test: ClinicalTest | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (test: ClinicalTest) => void;
    onDelete: (test: ClinicalTest) => void;
    onAddToProtocol: (test: ClinicalTest) => void;
}

const MediaPlaceholder = ({ label }: { label: string }) => (
    <div className="aspect-square rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-4 transition-colors hover:bg-slate-100 hover:border-slate-300">
        <ImageIcon className="h-6 w-6 text-slate-300 mb-2" />
        <span className="text-[10px] text-slate-500 font-medium">{label}</span>
    </div>
);

export function ClinicalTestDetailsModal({
    test,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    onAddToProtocol
}: ClinicalTestDetailsModalProps) {
    const isMobile = useIsMobile();
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (!previewImage) return;

        const handlePreviewEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.stopImmediatePropagation();
            setPreviewImage(null);
        };

        document.addEventListener('keydown', handlePreviewEscape);
        return () => document.removeEventListener('keydown', handlePreviewEscape);
    }, [previewImage]);

    useEffect(() => {
        if (!isOpen || !test) {
            setPreviewImage(null);
        }
    }, [isOpen, test]);

    if (!test) return null;

    const primaryImage = test.image_url || test.media_urls?.[0] || null;
    const galleryImages = test.media_urls?.slice(1, 3) ?? [];

    const handleDownloadPDF = () => {
        try {
            generateClinicalTestPdf(test);
            toast.success('PDF gerado com sucesso!');
        } catch (error) {
            logger.error('Error generating PDF', error, 'ClinicalTestDetailsModal');
            toast.error('Erro ao gerar PDF');
        }
    };

    return (
        <CustomModal 
            open={isOpen} 
            onOpenChange={(open) => !open && onClose()}
            isMobile={isMobile}
            contentClassName="max-w-5xl max-h-[92vh]"
        >
            <CustomModalHeader onClose={onClose}>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                            {test.category}
                        </span>
                        {test.regularity_sessions && (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-100">
                                <CalendarCheck className="h-3 w-3" />
                                A cada {test.regularity_sessions} sessões
                            </span>
                        )}
                    </div>
                    <CustomModalTitle className="text-2xl font-bold text-slate-800 leading-tight">
                        {test.name}
                        {test.name_en && (
                            <span className="block text-sm font-normal text-slate-400 italic mt-0.5">
                                {test.name_en}
                            </span>
                        )}
                    </CustomModalTitle>
                </div>
                <div className="flex items-center gap-2 ml-auto mr-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(test)}
                        className="h-8 w-8 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-full"
                        title="Editar teste"
                    >
                        <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(test)}
                        className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                        title="Excluir teste"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CustomModalHeader>

            <CustomModalBody className="p-0 sm:p-0">
                <div className="p-6 grid grid-cols-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-8 lg:gap-10">
                    {/* Left Column: Media */}
                    <div className="space-y-4">
                        {primaryImage ? (
                            <button
                                type="button"
                                onClick={() => setPreviewImage(primaryImage)}
                                className="w-full aspect-video rounded-2xl overflow-hidden shadow-sm border border-slate-100 relative bg-slate-50 group cursor-zoom-in text-left"
                                aria-label={`Ampliar imagem do teste ${test.name}`}
                            >
                                <img
                                    src={primaryImage}
                                    alt={`Execução: ${test.name}`}
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                <div className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none">
                                    <ZoomIn className="h-3.5 w-3.5" />
                                    Clique para ampliar
                                </div>
                            </button>
                        ) : (
                            <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative bg-slate-900 group cursor-pointer">
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 bg-slate-900/50 backdrop-blur-[1px] group-hover:bg-slate-900/40 transition-all">
                                    <PlayCircle className="h-16 w-16 mb-3 text-white/90 group-hover:scale-110 group-hover:text-teal-400 transition-all duration-300 shadow-xl rounded-full bg-black/20" />
                                    <span className="text-sm font-semibold tracking-wide">Visualizar Movimento</span>
                                </div>
                            </div>
                        )}
                        {galleryImages.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {galleryImages.map((url, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setPreviewImage(url)}
                                        className="aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm group relative cursor-zoom-in"
                                        aria-label={`Ampliar imagem ${i + 2} do teste ${test.name}`}
                                    >
                                        <img
                                            src={url}
                                            alt={`${test.name} - mídia ${i + 2}`}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors" />
                                        <div className="absolute right-2 bottom-2 rounded-full bg-white/90 p-1.5 text-slate-700 opacity-0 shadow transition-opacity group-hover:opacity-100">
                                            <ZoomIn className="h-3.5 w-3.5" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <MediaPlaceholder label="Posição Inicial" />
                                <MediaPlaceholder label="Posição Final" />
                            </div>
                        )}
                    </div>

                    {/* Right Column: Info */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <CheckSquare className="h-4 w-4 text-teal-600" />
                                Protocolo de Execução
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                                    {test.execution || test.description || 'Nenhuma instrução de execução disponível.'}
                                </p>
                            </div>
                        </div>

                        {test.positive_sign && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <ThumbsUp className="h-4 w-4 text-blue-600" />
                                    Interpretação Positiva
                                </h3>
                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 border-l-4 border-l-blue-500">
                                    <p className="text-blue-800 text-sm font-medium italic">
                                        {test.positive_sign}
                                    </p>
                                </div>
                            </div>
                        )}

                        {test.reference && (
                            <div className="pt-2">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Info className="h-3 w-3" />
                                    Base Científica / Referências
                                </h3>
                                <p className="text-xs text-slate-400 italic pl-5">
                                    {test.reference}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CustomModalBody>

            <CustomModalFooter isMobile={isMobile}>
                <Button
                    variant="ghost"
                    className="rounded-xl h-11 px-6 font-bold text-slate-500 hover:bg-slate-100"
                    onClick={handleDownloadPDF}
                >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                </Button>
                <Button
                    className="rounded-xl h-11 px-8 bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 gap-2 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                    onClick={() => onAddToProtocol(test)}
                >
                    Adicionar ao Protocolo
                </Button>
            </CustomModalFooter>

            {previewImage && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
                    onClick={() => setPreviewImage(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Imagem ampliada de ${test.name}`}
                >
                    <button
                        type="button"
                        onClick={() => setPreviewImage(null)}
                        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                        aria-label="Fechar imagem ampliada"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div
                        className="flex max-h-[94vh] w-full max-w-6xl flex-col gap-3"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="px-1">
                            <p className="text-sm font-semibold text-white">Imagem do exercício</p>
                            <p className="text-sm text-slate-300">{test.name}</p>
                        </div>

                        <div className="flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-3 sm:p-5 shadow-2xl">
                            <img
                                src={previewImage}
                                alt={`Imagem ampliada de ${test.name}`}
                                className={cn(
                                    "max-w-full rounded-xl object-contain",
                                    isMobile ? "max-h-[70dvh]" : "max-h-[82vh]"
                                )}
                            />
                        </div>
                    </div>
                </div>
            )}
        </CustomModal>
    );
}
