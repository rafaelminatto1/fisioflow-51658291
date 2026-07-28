import { Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tag } from "@/services/whatsapp-api";
import {
  countActiveFilters,
  EMPTY_INBOX_FILTERS,
  UNASSIGNED_KEY,
  type InboxFilters,
} from "@/features/whatsapp/inboxFilters";

const CHANNEL_OPTIONS: Array<{ key: InboxFilters["channels"][number]; label: string }> = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram", label: "Instagram" },
  { key: "webchat", label: "Chat do site" },
];

const AWAITING_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "Qualquer" },
  { value: 0, label: "Sem resposta" },
  { value: 2, label: "> 2h" },
  { value: 6, label: "> 6h" },
  { value: 24, label: "> 24h" },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function InboxFiltersPopover({
  filters,
  onChange,
  assignees,
  tags,
}: {
  filters: InboxFilters;
  onChange: (next: InboxFilters) => void;
  assignees: Array<{ id: string; name: string }>;
  tags: Tag[];
}) {
  const activeCount = countActiveFilters(filters);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filtrar conversas"
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            activeCount > 0 && "bg-primary/10 text-primary",
          )}
        >
          <Filter className="h-[18px] w-[18px]" />
          {activeCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold">Filtros</span>
          {activeCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onChange(EMPTY_INBOX_FILTERS)}
            >
              Limpar
            </Button>
          )}
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={filters.unreadOnly}
            onCheckedChange={(checked) => onChange({ ...filters, unreadOnly: checked === true })}
          />
          Somente não lidas
        </label>

        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Aguardando resposta
          </p>
          <div className="flex flex-wrap gap-1.5">
            {AWAITING_OPTIONS.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => onChange({ ...filters, awaitingReplyHours: option.value })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
                  filters.awaitingReplyHours === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Canal
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CHANNEL_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onChange({ ...filters, channels: toggle(filters.channels, option.key) })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
                  filters.channels.includes(option.key)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Responsável
          </p>
          <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
            {[{ id: UNASSIGNED_KEY, name: "Não atribuído" }, ...assignees].map((owner) => (
              <label key={owner.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={filters.assignees.includes(owner.id)}
                  onCheckedChange={() =>
                    onChange({ ...filters, assignees: toggle(filters.assignees, owner.id) })
                  }
                />
                <span className="truncate">{owner.name}</span>
              </label>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Etiquetas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onChange({ ...filters, tagIds: toggle(filters.tagIds, tag.id) })}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
                    filters.tagIds.includes(tag.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
