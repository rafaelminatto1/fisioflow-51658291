import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Zap, X, Share2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Achievement } from '@/hooks/useGamification';

interface AchievementModalProps {
    isOpen: boolean;
    onClose: () => void;
    achievement: Achievement | null;
}

const AchievementModal = ({ isOpen, onClose, achievement }: AchievementModalProps) => {
    if (!achievement) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, rotateY: 90 }}
                        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                        exit={{ scale: 0.9, opacity: 0, rotateY: -90 }}
                        transition={{ type: "spring", damping: 12 }}
                        className="relative w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
                    >
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-purple-600 to-indigo-700" />

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>

                        <div className="relative pt-12 pb-8 px-8 flex flex-col items-center text-center">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="w-32 h-32 bg-white rounded-3xl shadow-xl flex items-center justify-center border-4 border-purple-50 mb-6"
                            >
                                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                                    <Award className="w-14 h-14 text-purple-600" />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-2"
                            >
                                <div className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Nova Conquista!</div>
                                <h2 className="text-2xl font-black text-slate-800 leading-tight">
                                    {achievement.title}
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    {achievement.description}
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.4, type: "spring" }}
                                className="mt-6 inline-flex items-center gap-2 bg-yellow-400/20 text-yellow-700 px-4 py-2 rounded-full border border-yellow-200"
                            >
                                <Zap className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                <span className="font-bold">+{achievement.xp_reward} XP de Bônus</span>
                            </motion.div>

                            <div className="w-full grid grid-cols-2 gap-3 mt-8">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="rounded-2xl h-12 border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                                >
                                    Fechar
                                </Button>
                                <Button
                                    className="rounded-2xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200"
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Compartilhar
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AchievementModal;
