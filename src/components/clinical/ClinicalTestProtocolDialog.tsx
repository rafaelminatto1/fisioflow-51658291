import {

    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface Protocol {
    id: string;
    name: string;
    condition_name: string;
    clinical_tests?: string[];
}

interface ClinicalTestProtocolDialogProps {
    isOpen: boolean;
    onClose: () => void;
    protocols: Protocol[];
    isLoading: boolean;
    testName?: string;
    onConfirm: (protocolId: string) => void;
}

export function ClinicalTestProtocolDialog({
    isOpen,
    onClose,
    protocols,
    isLoading,
    testName,
    onConfirm
}: ClinicalTestProtocolDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Adicionar ao Protocolo</DialogTitle>
                    <p className="text-sm text-slate-500">
                        Selecione um protocolo para vincular o teste "{testName}".
                    </p>
                </DialogHeader>
                <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {protocols.length === 0 && !isLoading && (
                        <p className="text-center py-8 text-gray-500 text-sm italic">
                            Nenhum protocolo encontrado.
                        </p>
                    )}
                    {protocols.map((protocol) => (
                        <button
                            key={protocol.id}
                            onClick={() => onConfirm(protocol.id)}
                            className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 transition-all flex items-center justify-between group"
                        >
                            <div>
                                <p className="font-semibold text-slate-800 group-hover:text-teal-700">{protocol.name}</p>
                                <p className="text-xs text-slate-500">{protocol.condition_name}</p>
                            </div>
                            <div className="text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </button>
                    ))}
                </div>
                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
