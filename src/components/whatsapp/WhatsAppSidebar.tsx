import {
  ChevronDown,
  Filter,
  ListChecks,
  Loader2,
  Megaphone,
  Plus,
  Search,
  Tag,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConversationListItem } from "./ConversationListItem";
import { MetricsStrip } from "./MetricsStrip";
import { STATUS_TABS, PRIORITY_COLORS, PRIORITY_LABELS } from "./constants";
import type { Tag as TagType } from "@/services/whatsapp-api";

interface WhatsAppSidebarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  priorityFilter?: string;
  onPriorityFilterChange: (val?: string) => void;
  tagFilter?: string;
  onTagFilterChange: (val?: string) => void;
  availableTags: TagType[];
  conversations: any[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  bulkMode: boolean;
  onToggleBulkMode: () => void;
  selectedConvIds: Set<string>;
  onToggleBulkSelect: (id: string) => void;
  onShowBroadcast: () => void;
  onShowConfirmations: () => void;
  onShowNewConversation: () => void;
  metrics: any;
  pagination: any;
}

export const WhatsAppSidebar: React.FC<WhatsAppSidebarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  tagFilter,
  onTagFilterChange,
  availableTags,
  conversations,
  loading,
  selectedId,
  onSelect,
  bulkMode,
  onToggleBulkMode,
  selectedConvIds,
  onToggleBulkSelect,
  onShowBroadcast,
  onShowConfirmations,
  onShowNewConversation,
  metrics,
  pagination,
}) => {
  return (
    <div className="w-[380px] border-r flex flex-col bg-muted/5 z-20">
      <div className="p-4 space-y-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Mensagens</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-full ${bulkMode ? "bg-primary/10 text-primary" : ""}`}
              onClick={onToggleBulkMode}
            >
              <ListChecks className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={onShowConfirmations}
            >
              <CalendarCheck className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={onShowBroadcast}
            >
              <Megaphone className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-9 w-9 rounded-full shadow-md"
              onClick={onShowNewConversation}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-muted/50 border-none rounded-full h-10 focus-visible:ring-primary/20 focus-visible:bg-background transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 text-xs gap-1 rounded-full px-2.5 ${priorityFilter ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                <Filter className="h-3 w-3" />
                {priorityFilter ? PRIORITY_LABELS[priorityFilter] : "Prioridade"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={() => onPriorityFilterChange(undefined)}>
                Todas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(["low", "medium", "high", "urgent"] as const).map((p) => (
                <DropdownMenuItem
                  key={p}
                  className={PRIORITY_COLORS[p]}
                  onClick={() => onPriorityFilterChange(p)}
                >
                  {PRIORITY_LABELS[p]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {availableTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs gap-1 rounded-full px-2.5 ${tagFilter ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                >
                  <Tag className="h-3 w-3" />
                  {tagFilter ? (availableTags.find((t) => t.id === tagFilter)?.name ?? "Tag") : "Tag"}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={() => onTagFilterChange(undefined)}>
                  Todas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableTags.map((tag) => (
                  <DropdownMenuItem key={tag.id} onClick={() => onTagFilterChange(tag.id)}>
                    <div className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="px-2 py-2 bg-background border-b shadow-sm z-10">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-1.5 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => onStatusFilterChange(tab.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      <MetricsStrip metrics={metrics} />

      <ScrollArea className="flex-1 bg-background">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground px-6 text-center">
            <Filter className="h-12 w-12 opacity-20 mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhuma conversa</p>
          </div>
        ) : (
          <div className="py-1">
            {conversations.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedId === conv.id}
                onClick={() => bulkMode ? onToggleBulkSelect(conv.id) : onSelect(conv.id)}
                bulkMode={bulkMode}
                isSelectedBulk={selectedConvIds.has(conv.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {pagination.totalPages > 1 && (
        <div className="p-3 border-t text-center text-[10px] text-muted-foreground bg-muted/20 font-medium">
          Página {pagination.page} de {pagination.totalPages}
        </div>
      )}
    </div>
  );
};
