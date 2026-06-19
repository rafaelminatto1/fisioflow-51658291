import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Activity } from "lucide-react";
import type { WikiPage } from "@/types/wiki";

interface WikiPageCardProps {
  page: WikiPage;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function WikiPageCard({ page, onClick, onEdit, onDelete }: WikiPageCardProps) {
  const hasActions = Boolean(onEdit || onDelete);

  return (
    <Card 
      className="cursor-pointer bg-slate-50/50 border-slate-200/60 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200" 
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {page.icon && <span className="text-xl">{page.icon}</span>}
            <h3 className="font-bold font-display text-slate-900 line-clamp-1">{page.title}</h3>
          </div>
          {hasActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-200/50">
                  <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-lg">
                {onEdit && (
                  <DropdownMenuItem
                    className="rounded-lg focus:bg-blue-50 focus:text-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(e);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
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
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed font-body">
          {(page.content || "").slice(0, 100).replace(/[#*`]/g, "") || "Sem resumo disponível."}
        </p>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {page.category && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-white text-slate-500 border-slate-200">
                {page.category}
              </Badge>
            )}
            {(page.tags || []).slice(0, 1).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] uppercase tracking-wider font-bold bg-blue-50 text-blue-600 border-transparent">
                #{tag}
              </Badge>
            ))}
            {(page.tags || []).length > 1 && (
              <span className="text-[10px] font-bold text-slate-400">
                +{(page.tags || []).length - 1}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
            <Activity className="w-3 h-3" />
            <span>{page.view_count}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
