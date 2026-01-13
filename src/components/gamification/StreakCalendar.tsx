import { motion } from 'framer-motion';
import { Check, Flame } from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StreakCalendarProps {
    activeDates?: string[]; // ISO strings of dates where activity occurred
    todayActivity: boolean;
}

export default function StreakCalendar({ activeDates = [], todayActivity }: StreakCalendarProps) {
    // Generate last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return date;
    });

    return (
        <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                    Atividade Recente
                </h3>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">7 Dias</span>
            </div>

            <div className="flex justify-between items-center">
                {last7Days.map((date, index) => {
                    const isToday = isSameDay(date, new Date());
                    // Check if this date is in activeDates set
                    const isActive = activeDates.some(d => isSameDay(new Date(d), date)) || (isToday && todayActivity);
                    const dayName = format(date, 'EEEEE', { locale: ptBR }).toUpperCase();

                    return (
                        <div key={index} className="flex flex-col items-center gap-2">
                            <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                                {dayName}
                            </span>

                            <div className="relative">
                                <motion.div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors 
                                ${isActive
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30'
                                            : 'bg-muted/30 border-muted text-muted-foreground'
                                        }
                                ${isToday && !isActive ? 'border-dashed border-primary/50' : ''}
                            `}
                                    initial={false}
                                    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                                    transition={{ duration: 0.3 }}
                                >
                                    {isActive ? (
                                        <Check className="w-5 h-5 stroke-[3px]" />
                                    ) : (
                                        <span className="text-[10px] font-bold opacity-50">{format(date, 'd')}</span>
                                    )}
                                </motion.div>
                                {isToday && isActive && (
                                    <motion.div
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-background"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
