
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { generateClinicalTestPdf } from '@/utils/generateClinicalTestPdf';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';

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
        <span className="text-xs text-slate-500 font-medium">{label}</span>
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
    if (!test) return null;

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
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 rounded-2xl">
                {/* Modal Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-1 rounded">
                                {test.category}
                            </span>
                            {test.regularity_sessions && (
                                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-center gap-1">
                                    <CalendarCheck className="h-3 w-3" />
                                    A cada {test.regularity_sessions} sessões
                                </span>
                            )}
                        </div>
                        <DialogTitle className="text-2xl font-bold text-slate-800 leading-tight flex flex-col">
                            <span>{test.name}</span>
                            {test.name_en && (
                                <span className="text-sm font-normal text-slate-400 italic mt-0.5">
                                    {test.name_en}
                                </span>
                            )}
                        </DialogTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEdit(test)}
                            className="text-slate-400 hover:text-teal-600 transition p-2 bg-white rounded-full shadow-sm cursor-pointer border border-slate-100"
                            title="Editar teste"
                        >
                            <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onDelete(test)}
                            className="text-slate-400 hover:text-red-500 transition p-2 bg-white rounded-full shadow-sm cursor-pointer border border-slate-100"
                            title="Excluir teste"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition p-2 bg-white rounded-full shadow-sm cursor-pointer border border-slate-100">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Left Column: Media */}
                    <div className="space-y-4">
                        <div className="w-full aspect-video rounded-xl overflow-hidden shadow-sm border border-slate-200 relative bg-slate-900 group cursor-pointer">
                            {/* Placeholder for Video/GIF */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 bg-slate-900/50 backdrop-blur-[1px] group-hover:bg-slate-900/40 transition-all">
                                <PlayCircle className="h-16 w-16 mb-3 text-white/90 group-hover:scale-110 group-hover:text-teal-400 transition-all duration-300 shadow-xl rounded-full bg-black/20" />
                                <span className="text-sm font-semibold tracking-wide">Visualizar Movimento</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <MediaPlaceholder label="Posição Inicial" />
                            <MediaPlaceholder label="Posição Final" />
                        </div>
                    </div>

                    {/* Right Column: Info */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                <CheckSquare className="h-5 w-5 text-teal-600" />
                                Execução
                            </h3>
                            <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                                {test.execution || test.description}
                            </p>
                        </div>

                        {test.positive_sign && (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                    <ThumbsUp className="h-5 w-5 text-blue-600" />
                                    Interpretação Positiva
                                </h3>
                                <p className="text-slate-600 text-sm bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 italic">
                                    {test.positive_sign}
                                </p>
                            </div>
                        )}

                        {test.reference && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    Referências
                                </h3>
                                <p className="text-xs text-slate-400 italic">
                                    {test.reference}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <Button
                        variant="outline"
                        className="border-slate-300 text-slate-600 hover:bg-slate-100"
                        onClick={handleDownloadPDF}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PDF
                    </Button>
                    <Button
                        className="bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 border-0"
                        onClick={() => onAddToProtocol(test)}
                    >
                        Adicionar ao Protocolo
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
