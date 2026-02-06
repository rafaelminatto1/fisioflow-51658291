import React, { useState } from 'react';

    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
    Save,
    Tag,
    Target,
    FileText,
    Sparkles,
    Check,
    Info,
    ShieldCheck,
    Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { db, collection, addDoc } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface MeasurementField {
  label: string;
  value: string | number;
  unit?: string;
  enabled: boolean;
}

interface SaveMeasurementTemplateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fields: MeasurementField[];
    onSaved?: () => void;
}

export const SaveMeasurementTemplateModal: React.FC<SaveMeasurementTemplateModalProps> = ({
    open,
    onOpenChange,
    fields,
    onSaved,
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Personalizado',
        target_joint: '',
        purpose: '',
    });

    const enabledFields = fields.filter((f) => f.enabled);

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('O nome do modelo é obrigatório');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'clinical_test_templates'), {
                name: formData.name,
                category: formData.category,
                target_joint: formData.target_joint,
                purpose: formData.purpose,
                fields_definition: enabledFields,
                created_by: user?.id,
                organization_id: (user as { organization_id?: string } | null)?.organization_id,
                is_custom: true,
                created_at: new Date().toISOString(),
            });

            toast.success('Modelo salvo com sucesso!', {
                description: `O modelo "${formData.name}" agora está disponível na biblioteca.`,
                icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />
            });

            onSaved?.();
            onOpenChange(false);
            setFormData({ name: '', category: 'Personalizado', target_joint: '', purpose: '' });
        } catch (error: unknown) {
            logger.error('Erro ao salvar modelo', error, 'SaveMeasurementTemplateModal');
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error('Erro ao salvar modelo', {
                description: message
            });
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        'Ortopedia',
        'Esportiva',
        'Neurologia',
        'Geriatria',
        'Pediatria',
        'Saúde da Mulher',
        'Cardiorrespiratória',
        'Personalizado',
    ];

    const joints = [
        'Ombro',
        'Cotovelo',
        'Punho/Mão',
        'Coluna Cervical',
        'Coluna Torácica',
        'Coluna Lombar',
        'Quadril',
        'Joelho',
        'Tornozelo/Pé',
        'Geral',
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-teal-100 rounded-2xl shadow-2xl">
                <DialogHeader className="p-6 bg-slate-50/80 border-b border-slate-100 relative">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 bg-teal-600 rounded-xl text-white shadow-lg shadow-teal-100 ring-4 ring-teal-50">
                            <Save className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                Salvar como Modelo
                                <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-100 text-[10px] font-bold h-5 px-2">PREMIUM</Badge>
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium">
                                Crie um modelo reutilizável a partir desta configuração.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2 col-span-2">
                            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <FileText className="h-3 w-3 text-teal-600" />
                                Nome do Modelo
                            </Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Avaliação Funcional de LCA"
                                className="h-11 bg-white border-slate-200 focus:border-teal-400 focus:ring-teal-50 font-bold transition-all shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <Tag className="h-3 w-3 text-teal-600" />
                                Categoria
                            </Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger className="h-11 bg-white border-slate-200 font-medium">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                    {categories.map((c) => (
                                        <SelectItem key={c} value={c} className="font-medium">{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <Target className="h-3 w-3 text-teal-600" />
                                Articulação
                            </Label>
                            <Select
                                value={formData.target_joint}
                                onValueChange={(val) => setFormData({ ...formData, target_joint: val })}
                            >
                                <SelectTrigger className="h-11 bg-white border-slate-200 font-medium">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                    {joints.map((j) => (
                                        <SelectItem key={j} value={j} className="font-medium">{j}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <Info className="h-3 w-3 text-teal-600" />
                                Propósito/Descrição
                            </Label>
                            <Textarea
                                value={formData.purpose}
                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                placeholder="Descreva para que serve este teste ou modelo..."
                                rows={3}
                                className="bg-white border-slate-200 focus:border-teal-400 transition-all font-medium py-3"
                            />
                        </div>
                    </div>

                    <section className="space-y-3 p-5 bg-teal-50/30 rounded-2xl border border-teal-100/50">
                        <div className="flex items-center justify-between border-b border-teal-100/30 pb-2 mb-2">
                            <h4 className="text-[10px] font-bold text-teal-700 uppercase tracking-widest flex items-center gap-2">
                                <Layout className="h-3.5 w-3.5" />
                                Campos Selecionados ({enabledFields.length})
                            </h4>
                            <Badge variant="outline" className="text-[9px] bg-white border-teal-200 text-teal-600 font-bold px-2 py-0">PRÉ-VISUALIZAÇÃO</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {enabledFields.map((field) => (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={field.id}
                                    className="bg-white border border-teal-100 p-2 rounded-xl flex items-center gap-2 shadow-sm"
                                >
                                    <div className="h-5 w-5 bg-teal-50 rounded-md flex items-center justify-center">
                                        <Check className="h-3 w-3 text-teal-600" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">{field.label}</span>
                                    {field.required && <span className="h-1.5 w-1.5 bg-red-400 rounded-full" title="Obrigatório" />}
                                </motion.div>
                            ))}
                            {enabledFields.length === 0 && (
                                <p className="text-xs text-gray-500 italic font-medium w-full text-center py-4">Nenhum campo selecionado</p>
                            )}
                        </div>
                    </section>
                </div>

                <DialogFooter className="p-6 bg-slate-50/80 border-t border-slate-100">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl h-11"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading || !formData.name || enabledFields.length === 0}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-teal-100 ring-4 ring-teal-50/30 transition-all active:scale-95 group"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                    <Sparkles className="h-4 w-4" />
                                </motion.div>
                                Salvando...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Save className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                Criar Modelo
                            </span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
