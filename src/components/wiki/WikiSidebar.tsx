/**
 * WikiSidebar - Sidebar de navegação da Wiki
 * Mostra árvore de páginas organizadas por categoria
 */

import React, { useMemo } from 'react';
import { ChevronRight, Folder, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import type { WikiPage, WikiCategory } from '@/types/wiki';

interface WikiSidebarProps {
  pages: WikiPage[];
  categories: WikiCategory[];
  selectedPageId?: string;
  onPageSelect: (page: WikiPage) => void;
  onCreatePage: () => void;
}

export function WikiSidebar({
  pages,
  categories,
  selectedPageId,
  onPageSelect,
  onCreatePage,
}: WikiSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );

  // Build tree structure
  const pageTree = useMemo(() => {
    // Group by category
    const byCategory: Record<string, WikiPage[]> = {};
    pages.forEach((page) => {
      const cat = page.category || 'uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(page);
    });

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      Object.keys(byCategory).forEach((cat) => {
        byCategory[cat] = byCategory[cat].filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.content.toLowerCase().includes(query)
        );
      });
    }

    return byCategory;
  }, [pages, searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b">
        <Input
          placeholder="Buscar..."
          aria-label="Buscar na wiki"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Pages */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Uncategorized */}
          {pageTree.uncategorized && pageTree.uncategorized.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground px-2 py-1 font-medium">
    Sem Categoria
              </div>
              {pageTree.uncategorized.map((page) => (
                <PageItem
                  key={page.id}
                  page={page}
                  isSelected={selectedPageId === page.id}
                  onClick={() => onPageSelect(page)}
                />
              ))}
            </div>
          )}

          {/* Categories */}
          {categories.map((category) => {
            const categoryPages = pageTree[category.id] || [];
            const isExpanded = expandedCategories.has(category.id);

            return (
              <div key={category.id}>
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-1 px-2 py-1 hover:bg-muted rounded-md transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 transition-transform',
                      isExpanded && 'rotate-90'
                    )}
                  />
                  <Folder className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{category.name}</span>
                  {categoryPages.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {categoryPages.length}
                    </Badge>
                  )}
                </button>

                {isExpanded && categoryPages.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {categoryPages.map((page) => (
                      <PageItem
                        key={page.id}
                        page={page}
                        isSelected={selectedPageId === page.id}
                        onClick={() => onPageSelect(page)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Create Button */}
      <div className="p-4 border-t">
        <Button onClick={onCreatePage} className="w-full" size="sm">
          + Nova Página
        </Button>
      </div>
    </div>
  );
}

interface PageItemProps {
  page: WikiPage;
  isSelected: boolean;
  onClick: () => void;
}

function PageItem({ page, isSelected, onClick }: PageItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted'
      )}
    >
      {page.icon ? (
        <span className="text-sm">{page.icon}</span>
      ) : (
        <File className="w-4 h-4 text-muted-foreground" />
      )}
      <span className="truncate flex-1">{page.title}</span>
    </button>
  );
}
