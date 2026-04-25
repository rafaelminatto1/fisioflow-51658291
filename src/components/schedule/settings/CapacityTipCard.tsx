import { Lightbulb } from "lucide-react";

const TIPS = [
  "Avaliações iniciais geralmente precisam de 45-60min. Considere reduzir a capacidade nos horários de avaliação.",
  "Mantenha 5-10 min de buffer entre sessões para organização e limpeza do equipamento.",
  "Segundas e sextas tendem a ter mais demanda — considere aumentar a capacidade nesses dias.",
  "Terças e quintas à tarde costumam ter mais ociosidade. Considere abrir horários para atividades em grupo.",
  "Para eletroterapia (TENS, IFT), sessões de 20-30 min permitem maior rotatividade.",
];

export function CapacityTipCard() {
  const tipIndex = Math.floor(Date.now() / 86400000) % TIPS.length;
  const tip = TIPS[tipIndex];

  return (
    <div className="rounded-xl p-5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/40">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
          <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
            Dica de Eficiência
          </h4>
          <p className="text-[13px] text-blue-700 dark:text-blue-400 leading-relaxed">{tip}</p>
        </div>
      </div>
    </div>
  );
}
