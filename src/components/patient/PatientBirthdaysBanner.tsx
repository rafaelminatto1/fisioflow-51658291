import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cake, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { patientsApi, type PatientRow } from "@/api/v2";
import { cn } from "@/lib/utils";


export function PatientBirthdaysBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: aniversariantes = [] } = useQuery({
    queryKey: ["aniversariantes", "banner"],
    queryFn: async () => {
      const res = await patientsApi.list({
        status: "ativo",
        limit: 200,
        minimal: true,
      });
      const patients = (res?.data ?? []) as PatientRow[];
      
      const hoje = new Date();
      const currentMonth = hoje.getUTCMonth() + 1;
      const currentDay = hoje.getUTCDate();
      
      return patients
        .filter((p) => {
          if (!p.birth_date) return false;
          const birthDate = new Date(p.birth_date);
          const birthMonth = birthDate.getUTCMonth() + 1;
          const birthDay = birthDate.getUTCDate();
          
          // Aniversariantes do mês atual, com data maior ou igual a hoje (próximos 7 dias)
          if (birthMonth === currentMonth && birthDay >= currentDay && birthDay <= currentDay + 7) {
            return true;
          }
          // Caso a virada de mês esteja próxima (ex: 30 jan -> 5 fev), também pode ser adicionado
          // Para manter simples, vamos filtrar apenas o mês atual ou os próximos 7 dias no máximo
          const diffTime = Math.abs(hoje.getTime() - birthDate.setUTCFullYear(hoje.getUTCFullYear()));
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          return diffDays <= 7 && diffDays >= 0;
        })
        .map((p) => {
          const birthDate = new Date(p.birth_date!);
          return {
            id: p.id,
            name: p.name ?? p.full_name ?? "Paciente",
            birth_date: p.birth_date!,
            phone: p.phone ?? null,
            email: p.email ?? null,
            dia: birthDate.getUTCDate(),
            mes: birthDate.getUTCMonth() + 1,
            idade: new Date().getFullYear() - birthDate.getUTCFullYear(),
          };
        })
        .sort((a, b) => a.dia - b.dia);
    },
  });

  const hoje = new Date();
  const currentMonth = hoje.getUTCMonth() + 1;
  const currentDay = hoje.getUTCDate();

  const proximosAniversariantes = useMemo(() => {
    return aniversariantes.filter((a) => {
        // Pega os de hoje e dos próximos 7 dias
        if (a.mes === currentMonth && a.dia === currentDay) return true;
        if (a.mes === currentMonth && a.dia > currentDay && a.dia <= currentDay + 7) return true;
        return false;
    });
  }, [aniversariantes, currentMonth, currentDay]);

  if (isDismissed || proximosAniversariantes.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-r from-blue-500/10 via-primary/10 to-indigo-500/10 p-1 mb-6">
      <div className="relative z-10 bg-card rounded-[2rem] p-5 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30">
            <Cake className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              Aniversariantes Próximos
              <Badge className="bg-primary/20 text-primary border-primary/30 ml-2">
                {proximosAniversariantes.length}
              </Badge>
            </h3>
            <p className="text-sm font-medium text-slate-500">
              Celebre com seus pacientes e fortaleça o vínculo clínico.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto flex-1 md:justify-end py-2 px-2 no-scrollbar">
          {proximosAniversariantes.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl p-2.5 border transition-all hover:scale-105 whitespace-nowrap",
                a.dia === currentDay && a.mes === currentMonth
                  ? "border-primary/50 shadow-md shadow-primary/10"
                  : "border-slate-200 dark:border-slate-800"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary">
                {a.dia}
              </div>
              <div className="pr-2">
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {a.name.split(' ')[0]}
                </p>
                <p className="text-[10px] font-black uppercase text-slate-400">
                  {a.idade} anos {a.dia === currentDay ? '🎉 HOJE' : ''}
                </p>
              </div>
            </div>
          ))}
          {proximosAniversariantes.length > 3 && (
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs border border-slate-200 dark:border-slate-700">
              +{proximosAniversariantes.length - 3}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDismissed(true)}
          className="absolute top-4 right-4 h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
