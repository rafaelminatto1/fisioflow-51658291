import { useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Phone, Calendar, Clock, X, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WaitlistSlotNotificationPayload {
  waitlist_id: string;
  patient_id: string | null;
  patient_name: string | null;
  patient_phone: string;
  target_date: string;
  target_time: string;
}

export function WaitlistSlotNotificationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleWaitlistSlotAvailable = (event: CustomEvent<WaitlistSlotNotificationPayload>) => {
      const payload = event.detail;
      if (!payload) return;

      const formattedDate = format(new Date(payload.target_date), "EEEE, d 'de' MMMM", { locale: ptBR });
      const formattedTime = payload.target_time?.slice(0, 5) || payload.target_time;

      toast.custom((t) => (
        <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg min-w-[380px] max-w-md animate-in slide-in-from-top-2 duration-300">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Vaga Liberada!</p>
              <button
                type="button"
                onClick={() => t.dismiss()}
                className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
              Uma vaga ficou disponível para um paciente na fila de espera.
            </p>

            <div className="space-y-1.5 text-sm mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">Paciente:</span>
                <span className="text-slate-900 dark:text-slate-100 truncate flex-1">
                  {payload.patient_name || "Não informado"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400 font-mono">{payload.patient_phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">{formattedTime}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  t.dismiss();
                  navigate(`/schedule?date=${payload.target_date}&time=${payload.target_time}&patient=${payload.patient_id || ""}`);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <Check className="h-4 w-4" />
                Agendar Agora
              </button>
              <button
                type="button"
                onClick={() => t.dismiss()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-sm font-medium"
              >
                <X className="h-4 w-4" />
                Dispensar
              </button>
            </div>
          </div>
        </div>
      ), {
        duration: 0,
      });
    };

    window.addEventListener("waitlist_slot_available", handleWaitlistSlotAvailable as EventListener);

    return () => {
      window.removeEventListener("waitlist_slot_available", handleWaitlistSlotAvailable as EventListener);
    };
  }, [navigate]);

  return null;
}

export default WaitlistSlotNotificationListener;
