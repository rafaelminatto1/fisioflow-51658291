import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { CrmConversationViewModel } from "@/features/whatsapp/crmWhatsAppAdapter";

export function InboxNotificationsPopover({
  unread,
  soundEnabled,
  onToggleSound,
  onSelectConversation,
}: {
  unread: CrmConversationViewModel[];
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  onSelectConversation: (id: string) => void;
}) {
  const total = unread.reduce((sum, card) => sum + card.unreadCount, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notificações do inbox"
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            total > 0 && "text-foreground",
          )}
        >
          <Bell className="h-[18px] w-[18px]" />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(142_70%_42%)] px-1 text-[9px] font-extrabold text-white">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-extrabold">Não lidas</span>
          <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-muted-foreground">
            Som
            <Switch checked={soundEnabled} onCheckedChange={onToggleSound} />
          </label>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {unread.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhuma mensagem não lida.
            </p>
          ) : (
            unread.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectConversation(card.id)}
                className="flex w-full items-center gap-2 border-b border-border/60 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-bold">{card.name}</span>
                    <span className="ml-auto shrink-0 text-[10px] font-semibold text-muted-foreground">
                      {card.displayTime}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{card.preview}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[hsl(142_70%_42%)] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  {card.unreadCount}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
