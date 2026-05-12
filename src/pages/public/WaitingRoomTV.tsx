import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestPublic } from "@/api/v2/base";
import { Activity, Users, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LiveCheckin {
  patient_name: string;
  class_name: string;
  status: string;
  timestamp: number;
}

export default function WaitingRoomTV() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: liveData, isLoading } = useQuery({
    queryKey: ["live-checkins-tv"],
    queryFn: () => requestPublic<{ data: LiveCheckin[] }>("/api/groups/live-status"),
    refetchInterval: 5000, // Refresh a cada 5 segundos para TV
  });

  const checkins = liveData?.data || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-hidden flex flex-col">
      {/* Top Header / Clock */}
      <header className="p-8 flex justify-between items-center bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Painel de Recepção</h1>
            <p className="text-slate-400 font-bold tracking-widest text-sm">MOOCA FISIO • SÃO PAULO</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black tabular-nums">{format(now, "HH:mm:ss")}</p>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
        </div>
      </header>

      <main className="flex-1 p-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Recent Check-ins */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-indigo-400" />
            <h2 className="text-2xl font-black uppercase tracking-widest text-indigo-400">Presenças Confirmadas</h2>
          </div>

          <div className="space-y-4">
            {checkins.length === 0 ? (
              <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-600 font-bold">
                Aguardando primeiros check-ins do dia...
              </div>
            ) : (
              checkins.map((c, i) => (
                <div 
                  key={i} 
                  className="p-6 rounded-[2rem] bg-slate-900 border border-slate-800 flex items-center justify-between animate-in slide-in-from-right duration-500"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 text-2xl font-black">
                      {c.patient_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-2xl font-black">{c.patient_name}</p>
                      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">{c.class_name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-black uppercase">Presente</span>
                    </div>
                    <p className="text-slate-500 font-medium text-xs">{format(new Date(c.timestamp), "HH:mm")}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Health Tips / Branding */}
        <section className="flex flex-col gap-8">
           <div className="flex-1 rounded-[3rem] bg-gradient-to-br from-indigo-600 to-indigo-900 p-12 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full" />
              <div className="relative z-10">
                <Badge className="mb-6 bg-white/20 text-white border-none text-xs font-black uppercase tracking-widest px-4 py-1">Dica de Saúde</Badge>
                <h3 className="text-4xl font-black mb-6 leading-tight">Mantenha a regularidade para acelerar sua alta.</h3>
                <p className="text-indigo-100 text-lg font-medium max-w-md">
                  Pacientes com 100% de aderência recuperam-se em média 4 semanas mais rápido. Consulte seu Gêmeo Digital no app!
                </p>
              </div>
           </div>

           <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Clock className="h-6 w-6 text-indigo-400" />
                <span className="text-lg font-bold">Tempo médio de espera: <span className="text-indigo-400">4 min</span></span>
              </div>
              <ChevronRight className="h-6 w-6 text-slate-700" />
           </div>
        </section>
      </main>

      {/* Scrolling Ticker (Live News/Branding) */}
      <footer className="h-16 bg-indigo-600 flex items-center overflow-hidden">
        <div className="whitespace-nowrap flex animate-marquee">
          <p className="text-sm font-black uppercase tracking-[0.3em] mx-12">FisioFlow: O software de fisioterapia mais avançado do Brasil</p>
          <p className="text-sm font-black uppercase tracking-[0.3em] mx-12">Acesse seu portal em: app.moocafisio.com.br</p>
          <p className="text-sm font-black uppercase tracking-[0.3em] mx-12">Consulte seus exames via IA no prontuário digital</p>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}

function Badge({ children, className }: any) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}
