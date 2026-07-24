import { useState } from "react";
import { Calendar, Clock, CheckCircle2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BookingSlot {
  id: string;
  dayLabel: string;
  timeLabel: string;
  fullLabel: string;
}

interface QuickBookingCardProps {
  onSelectSlot: (slot: BookingSlot) => void;
  onSendSlotsMessage: (messageText: string) => void;
}

export function QuickBookingCard({ onSelectSlot, onSendSlotsMessage }: QuickBookingCardProps) {
  // Gera 3 horários sugeridos para agendamento de avaliação na clínica (São Paulo)
  const defaultSlots: BookingSlot[] = [
    {
      id: "slot-1",
      dayLabel: "Amanhã",
      timeLabel: "09:00",
      fullLabel: "Amanhã às 09:00 (Período da Manhã)",
    },
    {
      id: "slot-2",
      dayLabel: "Amanhã",
      timeLabel: "14:30",
      fullLabel: "Amanhã às 14:30 (Período da Tarde)",
    },
    {
      id: "slot-3",
      dayLabel: "Sexta-feira",
      timeLabel: "10:00",
      fullLabel: "Sexta-feira às 10:00 (Período da Manhã)",
    },
  ];

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const handleSlotClick = (slot: BookingSlot) => {
    setSelectedSlotId(slot.id);
    onSelectSlot(slot);
  };

  const handleSendAll = () => {
    const formatted =
      "📌 Olá! Temos os seguintes horários disponíveis para sua Avaliação Fisioterapêutica:\n\n" +
      defaultSlots.map((s, i) => `${i + 1}️⃣ ${s.fullLabel}`).join("\n") +
      "\n\nQual desses horários fica melhor para você?";
    onSendSlotsMessage(formatted);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-muted/20 p-3 shadow-sm text-xs space-y-2.5 max-w-[340px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          <span>📌 Oferecer Horários de Avaliação</span>
        </div>
        <span className="text-[10px] text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full font-medium">
          1-Click Booking
        </span>
      </div>

      <p className="text-muted-foreground text-[11px]">
        Clique em um horário para selecionar ou envie todas as opções diretamente no chat:
      </p>

      <div className="grid grid-cols-1 gap-1.5">
        {defaultSlots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          return (
            <button
              key={slot.id}
              onClick={() => handleSlotClick(slot)}
              className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                  : "border-border/60 bg-background hover:bg-muted/50 text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{slot.fullLabel}</span>
              </div>
              {isSelected ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <span className="text-[10px] text-muted-foreground shrink-0">Selecionar</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          size="sm"
          onClick={handleSendAll}
          className="w-full text-xs font-semibold gap-1.5 h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
        >
          <Send className="h-3.5 w-3.5" />
          Enviar Opções no Chat
        </Button>
      </div>
    </div>
  );
}
