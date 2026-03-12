import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Folder, Tag } from 'lucide-react';
import type { WikiPage } from '@/types/wiki';

interface WikiPageCardProps {
  page: WikiPage;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function WikiPageCard({ page, onClick, onEdit, onDelete }: WikiPageCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {page.icon && <span className="text-xl">{page.icon}</span>}
            <h3 className="font-semibold line-clamp-1">{page.title}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(e); }}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete?.(e); }} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {page.content.slice(0, 100).replace(/[#*`]/g, '')}...
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {page.category && (
              <Badge variant="outline" className="text-xs">
                <Folder className="w-3 h-3 mr-1" />
                {page.category}
              </Badge>
            )}
            {page.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {page.tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{page.tags.length - 2}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {page.view_count} visualizações
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
