import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentCardTimeProps {
  time: string;
  ongoing?: boolean;
  className?: string;
}

export const AppointmentCardTime: React.FC<AppointmentCardTimeProps> = ({ 
  time, 
  ongoing = false, 
  className 
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white rounded-2xl shadow-xl">
        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span className="text-sm font-black text-white dark:text-slate-900 font-mono tracking-tighter">
          {time}
        </span>
      </div>

      {ongoing && (
        <span className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-2xl text-[9px] font-black tracking-[0.2em] uppercase animate-pulse shadow-lg shadow-blue-500/40">
          EM ANDAMENTO
        </span>
      )}
    </div>
  );
};
