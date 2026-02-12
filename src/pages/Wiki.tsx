/**
 * Wiki Page - Knowledge Base colaborativa estilo Notion
 * Página principal da wiki com lista de páginas e busca
 */

import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {

  Search,
  Plus,
  FileText,
  Folder,
  Star,
  Clock,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WikiSidebar } from '@/components/wiki/WikiSidebar';
import { WikiEditor, WikiPageViewer } from '@/components/wiki/WikiEditor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { wikiService } from '@/lib/services/wikiService';

import type { WikiPage } from '@/types/wiki';

export default function WikiPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);

  // Query para páginas wiki (Firestore wiki_pages)
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['wiki-pages', user?.organizationId],
    queryFn: () => (user?.organizationId ? wikiService.listPages(user.organizationId) : Promise.resolve([])),
    enabled: !!user?.organizationId,
  });

  // Query para categorias (Firestore wiki_categories)
  const { data: categories = [] } = useQuery({
    queryKey: ['wiki-categories', user?.organizationId],
    queryFn: () => (user?.organizationId ? wikiService.listCategories(user.organizationId) : Promise.resolve([])),
    enabled: !!user?.organizationId,
  });

  // Filtrar páginas baseado em busca
  const filteredPages = useMemo(() => {
    if (!searchQuery) return pages;

    const query = searchQuery.toLowerCase();
    return pages.filter(
      (page) =>
        page.title.toLowerCase().includes(query) ||
        page.content.toLowerCase().includes(query) ||
        page.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [pages, searchQuery]);

  // Páginas favoritas e recentes
  const favorites = useMemo(() => pages.filter((p) => p.view_count > 10).slice(0, 5), [pages]);
  const recentPages = useMemo(
    () => [...pages].sort((a, b) => b.updated_at.toDate().getTime() - a.updated_at.toDate().getTime()).slice(0, 5),
    [pages]
  );

  const handleCreatePage = () => {
    setIsEditing(true);
    setSelectedPage(null);
  };

  const handlePageSelect = (page: WikiPage) => {
    setSelectedPage(page);
    navigate(`/wiki/${page.slug}`);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async (data: Omit<WikiPage, 'id' | 'created_at' | 'updated_at' | 'version'>) => {
    if (!user?.id || !user?.organizationId) return;
    try {
      await wikiService.savePage(user.organizationId, user.id, data, selectedPage ? { id: selectedPage.id, version: selectedPage.version } : undefined);
      await queryClient.invalidateQueries({ queryKey: ['wiki-pages', user.organizationId] });
      setIsEditing(false);
      if (selectedPage) {
        const updated = pages.find((p) => p.id === selectedPage.id);
        if (updated) setSelectedPage(updated);
      }
    } catch (err) {
      console.error('Erro ao salvar página wiki:', err);
    }
  };

  // Se está editando, mostrar editor
  if (isEditing) {
    return (
      <MainLayout>
        <div className="h-screen flex flex-col">
          <WikiEditor
            page={selectedPage}
            onCancel={() => setIsEditing(false)}
            onSave={handleSave}
          />
        </div>
      </MainLayout>
    );
  }

  // Se há um slug, mostrar a página
  if (slug && selectedPage) {
    return (
      <MainLayout>
        <div className="h-screen flex">
          <WikiSidebar
            pages={pages}
            categories={categories}
            selectedPageId={selectedPage.id}
            onPageSelect={handlePageSelect}
            onCreatePage={handleCreatePage}
          />
          <div className="flex-1 overflow-auto">
            <WikiPageViewer page={selectedPage} onEdit={handleEdit} />
          </div>
        </div>
      </MainLayout>
    );
  }

  // View principal (dashboard)
  return (
    <MainLayout>
      <div className="min-h-screen bg-background/50">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Wiki</h1>
                <p className="text-sm text-muted-foreground">
                  Base de conhecimento da sua organização
                </p>
              </div>
              <Button onClick={handleCreatePage}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Página
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar páginas, conteúdo, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Favorites */}
          {favorites.length > 0 && !searchQuery && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Populares
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((page) => (
                  <PageCard
                    key={page.id}
                    page={page}
                    onClick={() => handlePageSelect(page)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent */}
          {!searchQuery && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recentes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentPages.map((page) => (
                  <PageCard
                    key={page.id}
                    page={page}
                    onClick={() => handlePageSelect(page)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Pages */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Todas as Páginas
              {filteredPages.length > 0 && (
                <Badge variant="secondary">{filteredPages.length}</Badge>
              )}
            </h2>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando páginas...
              </div>
            ) : filteredPages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPages.map((page) => (
                  <PageCard
                    key={page.id}
                    page={page}
                    onClick={() => handlePageSelect(page)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? 'Nenhuma página encontrada'
                        : 'Nenhuma página criada ainda'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={handleCreatePage} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeira Página
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

interface PageCardProps {
  page: WikiPage;
  onClick: () => void;
}

function PageCard({ page, onClick }: PageCardProps) {
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
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-destructive">
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
