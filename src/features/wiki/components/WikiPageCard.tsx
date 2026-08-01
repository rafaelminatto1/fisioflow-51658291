import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CalendarDays,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WikiPage } from "@/types/wiki";

interface WikiPageCardProps {
  page: WikiPage;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function WikiPageCard({
  page,
  onClick,
  onEdit,
  onDelete,
}: WikiPageCardProps) {
  const hasActions = Boolean(onEdit || onDelete);
  const summary = (page.content || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[-#*_`>[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const evidenceLevel = page.clinical_metadata?.evidence_level;
  const updatedAt = (() => {
    const value = page.updated_at as unknown as {
      toDate?: () => Date;
      seconds?: number;
    };
    const date =
      value?.toDate?.() ??
      (value?.seconds
        ? new Date(value.seconds * 1000)
        : new Date(value as unknown as string));

    return Number.isNaN(date.getTime())
      ? null
      : new Intl.DateTimeFormat("pt-BR", {
          month: "short",
          year: "numeric",
        }).format(date);
  })();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Abrir página: ${page.title}`}
      className="group relative flex cursor-pointer overflow-hidden rounded-2xl border-slate-200/80 bg-card shadow-sm outline-none transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none"
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <span
        aria-hidden="true"
        className={cn(
          "w-1 shrink-0 bg-primary",
          evidenceLevel === "A" && "bg-emerald-500",
          evidenceLevel === "B" && "bg-sky-500",
          evidenceLevel === "C" && "bg-amber-500",
          evidenceLevel === "D" && "bg-violet-500",
        )}
      />

      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {page.icon ? (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-lg"
            >
              {page.icon}
            </span>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {page.category ? (
                <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">
                  {page.category}
                </span>
              ) : null}
              {evidenceLevel ? (
                <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Evidência {evidenceLevel}
                </span>
              ) : null}
            </div>
            <h3 className="mt-1 line-clamp-2 font-display text-base font-extrabold leading-snug tracking-tight text-foreground sm:text-[17px]">
              {page.title}
            </h3>
          </div>

          {hasActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Ações de ${page.title}`}
                  className="-mr-1 h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-xl border-slate-200 shadow-lg"
              >
                {onEdit && (
                  <DropdownMenuItem
                    className="rounded-lg focus:bg-primary/10 focus:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(e);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="rounded-lg text-destructive focus:bg-destructive/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(e);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="mt-3 line-clamp-2 font-body text-sm leading-relaxed text-muted-foreground">
          {summary || "Esta página ainda não possui um resumo clínico."}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-[11px] font-bold text-muted-foreground">
          {page.tags?.length ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="max-w-40 truncate">
                #{page.tags.slice(0, 2).join(" · #")}
              </span>
              {page.tags.length > 2 ? (
                <span aria-label={`mais ${page.tags.length - 2} tags`}>
                  +{page.tags.length - 2}
                </span>
              ) : null}
            </span>
          ) : null}
          {updatedAt ? (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Atualizada {updatedAt}</span>
            </span>
          ) : null}
          <span className="ml-auto flex items-center gap-1.5 tabular-nums">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {page.view_count}{" "}
              {page.view_count === 1 ? "visualização" : "visualizações"}
            </span>
          </span>
        </div>
      </div>
    </Card>
  );
}
