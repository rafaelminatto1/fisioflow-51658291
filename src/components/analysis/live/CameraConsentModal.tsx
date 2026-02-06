import React, { useState } from 'react';

    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, ShieldAlert } from 'lucide-react';

interface CameraConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConsentGiven: () => void;
}

const CameraConsentModal: React.FC<CameraConsentModalProps> = ({ isOpen, onClose, onConsentGiven }) => {
    const [agreed, setAgreed] = useState(false);

    const handleConfirm = () => {
        if (agreed) {
            onConsentGiven();
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-blue-600" />
                        Acesso à Câmera - Sessão Ao Vivo
                    </DialogTitle>
                    <DialogDescription>
                        Para iniciar a análise de biofeedback em tempo real, precisamos de acesso temporário à sua câmera.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Alert variant="default" className="bg-amber-50 border-amber-200">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Privacidade & Segurança</AlertTitle>
                        <AlertDescription className="text-amber-700 text-xs mt-1">
                            O processamento de vídeo é feito diretamente no seu navegador. Nenhuma imagem é enviada para servidores externos, a menos que você clique explicitamente em "Salvar Clip".
                        </AlertDescription>
                    </Alert>

                    <div className="flex items-start space-x-3 p-4 border rounded-md bg-slate-50">
                        <Checkbox
                            id="terms"
                            checked={agreed}
                            onCheckedChange={(checked) => setAgreed(checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Entendo que esta é uma ferramenta auxiliar educativa.
                            </label>
                            <p className="text-xs text-muted-foreground">
                                O biofeedback não substitui a orientação clínica presencial. A responsabilidade pela conduta é do profissional de saúde.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={handleConfirm} disabled={!agreed}>
                        Autorizar e Iniciar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CameraConsentModal;
