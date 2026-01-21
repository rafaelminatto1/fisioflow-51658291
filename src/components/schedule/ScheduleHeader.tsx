import React, { memo } from 'react';
import { BadgeCheck, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/shared/ui/card';
import type { Appointment } from '@/types/appointment';

interface ScheduleHeaderProps {
    displayName?: string;
    consultasRestantes?: number;
    completedCount?: number;
    totalCount?: number;
    confirmationRate?: number;
}

export const ScheduleHeader = memo(({
    displayName = "Dr. Rafael",
    consultasRestantes = 0,
    completedCount = 0,
    totalCount = 0,
    confirmationRate = 0
}: ScheduleHeaderProps) => {

    return (
        <div className="relative rounded-3xl overflow-hidden mb-6 group shrink-0 shadow-soft">
            {/* Background Image & Overlays */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2068&auto=format&fit=crop')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 to-slate-800/20 backdrop-blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

            {/* Main Content Area */}
            <div className="relative z-10 p-8 flex flex-col md:flex-row items-end justify-between gap-6">

                {/* Welcome Section */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-white text-xs font-medium tracking-wide">
                            CLINIC OVERVIEW
                        </span>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-1 shadow-black/10 drop-shadow-md">
                        Olá, {displayName}
                    </h2>
                    <p className="text-blue-50 opacity-90 font-light">
                        Você tem <span className="font-semibold text-white">{consultasRestantes} consultas</span> hoje.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="flex gap-4 w-full md:w-auto">
                    {/* Completed Card */}
                    <div className="glass-card rounded-2xl p-4 min-w-[150px] flex flex-col justify-between hover:bg-white/50 transition-colors cursor-pointer group/card bg-white/40 backdrop-blur-md border border-white/30 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <BadgeCheck className="text-slate-700 w-5 h-5" />
                            <span className="text-[10px] font-bold bg-white/40 px-2 py-1 rounded-full text-slate-800 shadow-sm">
                                +12%
                            </span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {completedCount}<span className="text-slate-500 text-lg font-normal">/{totalCount}</span>
                            </h3>
                            <p className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">
                                Completados
                            </p>
                        </div>
                    </div>

                    {/* Confirmation Rate Card */}
                    <div className="glass-card rounded-2xl p-4 min-w-[150px] flex flex-col justify-between hover:bg-white/50 transition-colors cursor-pointer group/card bg-white/40 backdrop-blur-md border border-white/30 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <TrendingUp className="text-slate-700 w-5 h-5" />
                            <span className="text-[10px] font-bold bg-white/40 px-2 py-1 rounded-full text-slate-800 shadow-sm">
                                ~5%
                            </span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {confirmationRate}%
                            </h3>
                            <p className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">
                                Confirmação
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Status Bar */}
            <div className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-md px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-6 text-xs font-medium text-white/90">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        Ultrassom <span className="opacity-60 font-light ml-1">Disponível</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Laser Co2 <span className="opacity-60 font-light ml-1">Em manutenção</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Tens <span className="opacity-60 font-light ml-1">Em uso (15m)</span>
                    </div>
                </div>
                <button className="text-xs text-white/70 hover:text-white flex items-center gap-1 transition-colors">
                    Gerenciar
                    <Info className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
});

ScheduleHeader.displayName = 'ScheduleHeader';
