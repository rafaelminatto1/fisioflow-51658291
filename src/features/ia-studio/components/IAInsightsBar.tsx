import React from "react";
import { Zap, Clock, Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export const IAInsightsBar = () => {
    const stats = [
        {
            label: "Tempo Economizado",
            value: "12.4h",
            sub: "Este mês",
            icon: <Clock className="w-4 h-4 text-violet-500" />,
            trend: "+2h vs mês ant.",
            color: "from-violet-500/10 to-transparent"
        },
        {
            label: "Pacientes em Risco",
            value: "08",
            sub: "Precisam de reengajamento",
            icon: <Users className="w-4 h-4 text-emerald-500" />,
            trend: "-2 vs semana ant.",
            color: "from-emerald-500/10 to-transparent"
        },
        {
            label: "Precisão Diagnóstica",
            value: "98.2%",
            sub: "Média de acerto ADM",
            icon: <Zap className="w-4 h-4 text-blue-500" />,
            trend: "99.9% uptime",
            color: "from-blue-500/10 to-transparent"
        },
        {
            label: "Taxa de Alta",
            value: "84%",
            sub: "Dentro da predição",
            icon: <TrendingUp className="w-4 h-4 text-amber-500" />,
            trend: "+5% eficiência",
            color: "from-amber-500/10 to-transparent"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`relative p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden group`}
                >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-50`} />
                    <div className="relative z-10 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-50 dark:border-slate-700">
                                {stat.icon}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.trend}</span>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black tracking-tighter">{stat.value}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">{stat.sub}</p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
