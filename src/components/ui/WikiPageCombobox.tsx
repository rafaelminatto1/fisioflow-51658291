import * as React from "react";
import { ChevronsUpDown, Search, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { wikiService } from "@/lib/services/wikiService";
import { useAuth } from "@/hooks/useAuth";
import type { WikiPage } from "@/types/wiki";

interface WikiPageComboboxProps {
  value?: string;
  onValueChange: (value: string, page?: WikiPage) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function WikiPageCombobox({
  value,
  onValueChange,
  disabled = false,
  className,
  placeholder = "Buscar página da Wiki...",
}: WikiPageComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const { organizationId } = useAuth();

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["wiki-pages-combobox", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return await wikiService.listPages(organizationId);
    },
    enabled: !!organizationId,
  });

  const selectedPage = React.useMemo(() => {
    return pages.find((page) => page.id === value || page.slug === value);
  }, [pages, value]);

  const filteredPages = React.useMemo(() => {
    if (!searchTerm) return pages;

    const searchLower = searchTerm.toLowerCase();
    return pages.filter(
      (page) =>
        String(page.title ?? "")
          .toLowerCase()
          .includes(searchLower) ||
        String(page.slug ?? "")
          .toLowerCase()
          .includes(searchLower) ||
        String(page.category ?? "")
          .toLowerCase()
          .includes(searchLower) ||
        (Array.isArray(page.tags) &&
          page.tags.some((t) =>
            String(t ?? "")
              .toLowerCase()
              .includes(searchLower),
          )),
    );
  }, [pages, searchTerm]);

  // Group pages by category
  const groupedPages = React.useMemo(() => {
    const groups: Record<string, WikiPage[]> = {};
    filteredPages.forEach((page) => {
      const category = page.category || "Sem Categoria";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(page);
    });
    return groups;
  }, [filteredPages]);

  const handleSelect = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    onValueChange(pageId === value ? "" : pageId, page);
    setOpen(false);
    setSearchTerm("");
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Patologias":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Exercícios":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Protocolos":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={selectedPage ? `Página: ${selectedPage.title}` : placeholder}
          className={cn(
            "w-full justify-between bg-background h-11 border-slate-200 hover:border-teal-300 hover:bg-teal-50/10 transition-all focus:ring-2 focus:ring-teal-400 focus:ring-offset-2",
            className,
          )}
          disabled={disabled}
        >
          {selectedPage ? (
            <div className="flex items-center gap-2 truncate">
              <BookOpen className="h-4 w-4 text-teal-600 shrink-0" />
              <span className="font-semibold truncate text-slate-700">{selectedPage.title}</span>
              {selectedPage.category && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 h-4 shrink-0 font-bold uppercase tracking-wider border",
                    getCategoryColor(selectedPage.category),
                  )}
                >
                  {selectedPage.category}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-slate-400 flex items-center gap-2 font-medium">
              <BookOpen className="h-4 w-4 text-slate-300 shrink-0" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[450px] p-0 shadow-2xl border-slate-200 rounded-xl overflow-hidden"
        align="start"
      >
        <Command shouldFilter={false} className="rounded-none">
          <div className="flex items-center border-b px-3 bg-muted" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 text-teal-600 opacity-70" />
            <CommandInput
              placeholder="Buscar por título, categoria ou tags..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="h-12 border-0 bg-transparent focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[300px]">
            {isLoading ? (
              <div className="py-12 text-center animate-pulse">
                <div className="flex justify-center mb-3">
                  <div className="h-2 w-2 bg-teal-600 rounded-full animate-bounce mx-0.5"></div>
                  <div className="h-2 w-2 bg-teal-600 rounded-full animate-bounce mx-0.5 delay-150"></div>
                  <div className="h-2 w-2 bg-teal-600 rounded-full animate-bounce mx-0.5 delay-300"></div>
                </div>
                <p className="text-sm text-slate-500 font-medium">Carregando páginas da Wiki...</p>
              </div>
            ) : filteredPages.length === 0 ? (
              <CommandEmpty>
                <div className="py-12 text-center px-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Search className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-600 font-bold mb-1">
                    Nenhuma página encontrada para "{searchTerm}"
                  </p>
                  <p className="text-xs text-slate-500">
                    Verifique a ortografia ou crie a página na Wiki primeiro.
                  </p>
                </div>
              </CommandEmpty>
            ) : (
              Object.entries(groupedPages).map(([category, categoryPages]) => (
                <CommandGroup key={category} heading={category} className="px-2">
                  {categoryPages.map((page) => (
                    <CommandItem
                      key={page.id}
                      value={page.id}
                      onSelect={() => handleSelect(page.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-teal-50/50 transition-colors group mb-1 border border-transparent aria-selected:border-teal-100/30"
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border transition-all shrink-0",
                          value === page.id || value === page.slug
                            ? "bg-teal-600 border-teal-600 text-white"
                            : "bg-white border-slate-100 text-slate-500 group-hover:border-teal-200 group-hover:text-teal-600",
                        )}
                      >
                        <BookOpen className="h-4 w-4" />
                      </div>

                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-bold truncate text-sm transition-colors",
                              value === page.id || value === page.slug
                                ? "text-teal-900"
                                : "text-slate-700 group-hover:text-teal-800",
                            )}
                          >
                            {page.title}
                          </span>
                          {page.category && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] h-4 px-1.5 opacity-80 shrink-0 font-bold"
                            >
                              {page.category}
                            </Badge>
                          )}
                        </div>
                        {page.tags && page.tags.length > 0 && (
                          <div className="flex gap-1 pt-1.5">
                            {page.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
