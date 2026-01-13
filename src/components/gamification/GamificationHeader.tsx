import { motion } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface GamificationHeaderProps {
    level: number;
    currentXp: number;
    xpPerLevel: number;
    streak: number;
}

export default function GamificationHeader({
    level,
    currentXp,
    xpPerLevel,
    streak
}: GamificationHeaderProps) {
    const { profile } = useAuth();
    const xpPercentage = Math.min((currentXp / xpPerLevel) * 100, 100);

    // Greeting based on time
    const hour = new Date().getHours();
    let greeting = 'Bem-vindo de volta';
    if (hour < 12) greeting = 'Bom dia';
    else if (hour < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl">
            {/* Background shapes */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-black/10 blur-2xl" />

            <div className="relative p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center gap-6">

                    {/* Avatar Level Ring */}
                    <div className="relative group">
                        <div className="absolute inset-0 rounded-full bg-white/20 blur-md transform group-hover:scale-110 transition-transform duration-500" />
                        <div className="relative h-24 w-24 rounded-full p-1 bg-white/10 backdrop-blur-sm ring-1 ring-white/30">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r="40%"
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    className="text-white/20"
                                />
                                <motion.circle
                                    cx="50%"
                                    cy="50%"
                                    r="40%"
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                                    strokeDasharray="251.2"
                                    initial={{ strokeDashoffset: 251.2 }}
                                    animate={{ strokeDashoffset: 251.2 - (251.2 * xpPercentage) / 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-medium opacity-80">Nível</span>
                                <span className="text-2xl font-bold">{level}</span>
                            </div>
                        </div>
                        {/* Level Up Indicator (simple pulse if close to leveling) */}
                        {xpPercentage > 80 && (
                            <div className="absolute -top-1 -right-1">
                                <span className="relative flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500"></span>
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <p className="text-indigo-100 font-medium flex items-center justify-center sm:justify-start gap-2">
                                {greeting}, {profile?.full_name?.split(' ')[0] || 'Atleta'}! <Sparkles className="w-4 h-4 text-yellow-300" />
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                Sua jornada está incrível
                            </h2>
                        </motion.div>

                        <motion.div
                            className="space-y-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex justify-between text-sm font-medium">
                                <span className="text-indigo-100">{currentXp} XP</span>
                                <span className="text-indigo-200">{xpPerLevel} XP para o Nível {level + 1}</span>
                            </div>
                            <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${xpPercentage}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                />
                            </div>
                        </motion.div>
                    </div>

                    {/* Streak Badge */}
                    <motion.div
                        className="flex flex-col items-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 min-w-[100px]"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Trophy className="w-8 h-8 text-yellow-400 mb-1" />
                        <span className="text-2xl font-bold">{streak}</span>
                        <span className="text-xs text-indigo-200">Dias Seguidos</span>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
