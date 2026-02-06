import { motion, AnimatePresence } from 'framer-motion';
import { Snowflake, ShieldAlert, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StreakFreezeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPoints: number;
    cost: number;
    onConfirm: () => void;
    isLoading?: boolean;
}

const StreakFreezeModal = ({ isOpen, onClose, currentPoints, cost, onConfirm, isLoading }: StreakFreezeModalProps) => {
    const canAfford = currentPoints >= cost;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-blue-900/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="bg-blue-600 p-8 flex flex-col items-center text-white relative">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                <Snowflake className="w-10 h-10 animate-pulse" />
                            </div>
                            <h2 className="text-xl font-bold">Congelar Sequência</h2>
                            <p className="text-blue-100 text-sm text-center mt-2">Proteja seus dias ativos mesmo se você não registrar atividade hoje.</p>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="space-y-0.5">
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Seu Saldo</p>
                                    <p className="text-lg font-black text-slate-800">{currentPoints} pts</p>
                                </div>
                                <div className="text-right space-y-0.5">
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Custo</p>
                                    <p className="text-lg font-black text-blue-600">-{cost} pts</p>
                                </div>
                            </div>

                            {!canAfford && (
                                <div className="flex gap-3 p-3 bg-red-50 rounded-xl border border-red-100 text-red-600 text-xs">
                                    <ShieldAlert className="w-4 h-4 shrink-0" />
                                    <p>Você não tem pontos suficientes para esta ação. Continue treinando para ganhar mais!</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" onClick={onClose} className="rounded-2xl h-12">
                                    Talvez depois
                                </Button>
                                <Button
                                    onClick={onConfirm}
                                    disabled={!canAfford || isLoading}
                                    className="rounded-2xl h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 border-none"
                                >
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default StreakFreezeModal;
