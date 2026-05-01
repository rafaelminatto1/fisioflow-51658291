import { CancellationRulesManager } from "@/components/schedule/settings/CancellationRulesManager";
import { NotificationSettingsManager } from "@/components/schedule/settings/NotificationSettingsManager";
import { NoShowPolicyCard } from "@/components/schedule/settings/NoShowPolicyCard";
import { BookingWindowSettings } from "@/components/schedule/settings/BookingWindowSettings";
import { BlockedTimesManager } from "@/components/schedule/settings/BlockedTimesManager";
import { GlobalPresetsPanel } from "@/components/schedule/settings/GlobalPresetsPanel";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import {
  ShieldAlert,
  Bell,
  UserX,
  CalendarOff,
} from "lucide-react";

/**
 * PoliciesRulesTab — Merge de Políticas + Bloqueios + Aparência
 *
 * Consolida 3 tabs legadas em uma única seção organizada:
 * 1. Política de Cancelamento
 * 2. Política de No-Show
 * 3. Bloqueios e Ausências
 * 4. Janela de Agendamento
 * 5. Notificações
 * 6. Layouts Rápidos (aparência visual)
 */
export function PoliciesRulesTab() {
  return (
    <div className="space-y-6">
      {/* Row 1: Cancelamento + No-Show */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SettingsSectionCard
          icon={<ShieldAlert className="h-4 w-4" />}
          iconBg="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
          title="Política de Cancelamento"
          description="Antecedência mínima, limites mensais e taxas por cancelamento tardio"
          variant="warning"
        >
          <CancellationRulesManager />
        </SettingsSectionCard>

        <SettingsSectionCard
          icon={<UserX className="h-4 w-4" />}
          iconBg="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
          title="Política de No-Show"
          description="Controle de faltas sem aviso e ações automáticas"
        >
          <NoShowPolicyCard />
        </SettingsSectionCard>
      </div>

      {/* Row 2: Bloqueios */}
      <SettingsSectionCard
        icon={<CalendarOff className="h-4 w-4" />}
        iconBg="bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400"
        title="Bloqueios e Ausências"
        description="Bloqueie horários, férias e feriados"
      >
        <BlockedTimesManager filter="all" />
      </SettingsSectionCard>

      {/* Row 3: Janela de Agendamento + Notificações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BookingWindowSettings />

        <SettingsSectionCard
          icon={<Bell className="h-4 w-4" />}
          iconBg="bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400"
          title="Notificações Automáticas"
          description="Confirmações, lembretes e mensagens por canal"
          variant="highlight"
        >
          <NotificationSettingsManager />
        </SettingsSectionCard>
      </div>

      {/* Row 4: Layouts Rápidos — GlobalPresetsPanel already has its own SettingsSectionCard */}
      <GlobalPresetsPanel />
    </div>
  );
}
