/**
 * Wiki Page - Knowledge Base colaborativa estilo Notion
 * Refatorada para ser modular e simplificada.
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  FileText,
  Star,
  Clock,
  Sparkles,
} from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { WikiSidebar } from '@/components/wiki/WikiSidebar';
import { WikiEditor, WikiPageViewer } from '@/components/wiki/WikiEditor';
import { useAuth } from '@/contexts/AuthContext';
import { wikiService } from '@/lib/services/wikiService';
import { instantiateTemplate } from '@/features/wiki/templates/templateTransform';
import {
  getTemplateById,
  listTemplateCatalog,
  type WikiTemplateBlueprint,
} from '@/features/wiki/templates/templateCatalog';
import { toast } from 'sonner';

import type { WikiPage } from '@/types/wiki';
import type { KnowledgeArticle, KnowledgeCurationStatus } from '@/types/knowledge-base';

// Hooks Modulares
import { useWikiPages } from '@/hooks/wiki/useWikiPages';
import { useWikiTriage } from '@/hooks/wiki/useWikiTriage';
import { useKnowledgeBase } from '@/hooks/wiki/useKnowledgeBase';

// Componentes Modulares
import { WikiTriageBoard } from '@/features/wiki/components/WikiTriageBoard';
import { KnowledgeHubView } from '@/features/wiki/components/KnowledgeHubView';
import { WikiPageCard } from '@/features/wiki/components/WikiPageCard';

const TRIAGE_WIP_LIMITS = {
  backlog: 30,
  'in-progress': 10,
  done: 999,
};

export default function WikiPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { user, profile, organizationId } = useAuth();
  const currentOrganizationId = organizationId ?? profile?.organization_id;
  const currentUserId = user?.uid ?? profile?.user_id ?? profile?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Estados Locais
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [draftPage, setDraftPage] = useState<Partial<WikiPage> | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  
  // Estados de Curadoria (KB)
  const [activeArticle, setActiveArticle] = useState<KnowledgeArticle | null>(null);
  const [annotationScope, setAnnotationScope] = useState<'organization' | 'user'>('organization');
  const [annotationHighlights, setAnnotationHighlights] = useState('');
  const [annotationObservations, setAnnotationObservations] = useState('');
  const [annotationStatus, setAnnotationStatus] = useState<KnowledgeCurationStatus>('pending');
  const [annotationNotes, setAnnotationNotes] = useState('');
  const [auditArticle, setAuditArticle] = useState<KnowledgeArticle | null>(null);

  // Hooks Customizados
  const { 
    pages, 
    categories, 
    favorites, 
    recentPages, 
    isLoading, 
    savePage, 
    deletePage 
  } = useWikiPages(currentOrganizationId, currentUserId);

  const {
    triageBuckets,
    triageEvents,
    handleTriageDragEnd,
    handleQuickStatusChange,
    hasActiveTriageFilters,
    triagePages
  } = useWikiTriage(pages, currentOrganizationId, currentUserId);

  const {
    knowledgeStats,
    knowledgeGroupsFiltered,
    filteredKnowledge,
    auditItems,
    semanticScoreMap,
    kbFilters,
    setKbFilters,
    syncing,
    indexing,
    handleSyncArticles,
    handleIndexArticles,
    handleSaveAnnotation,
    curationMap,
    annotationMap
  } = useKnowledgeBase(currentOrganizationId, currentUserId);

  const templates = useMemo(() => listTemplateCatalog(), []);
  const activeTemplate = useMemo(
    () => (selectedTemplateId === 'blank' ? null : getTemplateById(selectedTemplateId)),
    [selectedTemplateId]
  );

  // Filtragem de páginas
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

  const articleTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    filteredKnowledge.forEach((item) => map.set(item.id, item.title));
    return map;
  }, [filteredKnowledge]);

  // Efeitos
  useEffect(() => {
    if (!slug) {
      setSelectedPage(null);
      return;
    }
    const page = pages.find((p) => p.slug === slug || p.id === slug) ?? null;
    setSelectedPage(page);
  }, [pages, slug]);

  useEffect(() => {
    if (!activeArticle) return;
    const currentAnnotation =
      annotationScope === 'user'
        ? annotationMap.user.get(activeArticle.id)
        : annotationMap.org.get(activeArticle.id);
    setAnnotationHighlights((currentAnnotation?.highlights || activeArticle.highlights).join('\n'));
    setAnnotationObservations((currentAnnotation?.observations || activeArticle.observations).join('\n'));
  }, [annotationScope, activeArticle, annotationMap]);

  // Handlers
  const handlePageSelect = (page: WikiPage) => {
    setSelectedPage(page);
    navigate(`/wiki/${page.slug}`);
  };

  const handleCreatePage = () => {
    setSelectedPage(null);
    setDraftPage(null);
    setSelectedTemplateId('blank');
    setTemplateValues({});
    setIsTemplateDialogOpen(true);
  };

  const startBlankPage = () => {
    setDraftPage(null);
    setSelectedPage(null);
    setIsTemplateDialogOpen(false);
    setIsEditing(true);
  };

  const startTemplatePage = (template: WikiTemplateBlueprint) => {
    try {
      const instantiated = instantiateTemplate({
        templateId: template.id,
        values: templateValues,
      });

      if (instantiated.missingRequired.length > 0) {
        toast.error(`Campos obrigatórios ausentes: ${instantiated.missingRequired.join(', ')}`);
        return;
      }

      const lines = instantiated.content.split('\n');
      const derivedTitle = lines[0]?.replace(/^#\s*/, '').trim() || template.name;
      const isTriageTemplate = ['incident-postmortem-v1', 'meeting-notes-v1', 'product-prd-v1'].includes(template.id);
      
      setDraftPage({
        title: derivedTitle,
        content: instantiated.content,
        category: isTriageTemplate ? 'triage' : template.domain,
        tags: template.tags,
        is_published: true,
        template_id: template.id,
      });
      setSelectedPage(null);
      setIsTemplateDialogOpen(false);
      setIsEditing(true);
    } catch (error) {
      console.error('Erro ao instanciar template:', error);
      toast.error('Não foi possível aplicar o template.');
    }
  };

  const onSavePage = async (data: any) => {
    try {
      const savedId = await savePage(data, selectedPage?.id, selectedPage?.version);
      setIsEditing(false);
      setDraftPage(null);
      // Busca a página salva para navegar
      const refreshed = await queryClient.fetchQuery({
        queryKey: ['wiki-pages', currentOrganizationId],
        queryFn: () => wikiService.listPages(currentOrganizationId!),
      });
      const page = refreshed.find(p => p.id === savedId);
      if (page) navigate(`/wiki/${page.slug}`);
    } catch (err) {
      // Toast já exibido no hook
    }
  };

  const openAnnotationDialog = (article: KnowledgeArticle) => {
    setActiveArticle(article);
    setAnnotationScope('organization');
    setAnnotationStatus((curationMap.get(article.id)?.status as KnowledgeCurationStatus) || 'pending');
    setAnnotationNotes(curationMap.get(article.id)?.notes || '');
  };

  const onSaveAnnotation = async () => {
    if (!activeArticle) return;
    try {
      await handleSaveAnnotation({
        articleId: activeArticle.id,
        scope: annotationScope,
        highlights: annotationHighlights.split('\n').filter(Boolean),
        observations: annotationObservations.split('\n').filter(Boolean),
        status: annotationStatus,
        notes: annotationNotes
      });
      setActiveArticle(null);
    } catch (err) {
      // Erro já tratado no hook
    }
  };

  // Renderização Condicional: Editor
  if (isEditing) {
    return (
      <MainLayout>
        <div className="h-screen flex flex-col">
          <WikiEditor
            page={selectedPage}
            draft={draftPage}
            onCancel={() => {
              setIsEditing(false);
              setDraftPage(null);
            }}
            onSave={onSavePage}
          />
        </div>
      </MainLayout>
    );
  }

  // Renderização Condicional: Visualização de Página
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
            <WikiPageViewer
              page={selectedPage}
              onEdit={() => setIsEditing(true)}
              onBack={() => navigate('/wiki')}
            />
          </div>
        </div>
      </MainLayout>
    );
  }

  // Renderização Principal: Dashboard da Wiki
  return (
    <MainLayout>
      <div className="h-full flex overflow-hidden">
        <WikiSidebar
          pages={pages}
          categories={categories}
          onPageSelect={handlePageSelect}
          onCreatePage={handleCreatePage}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {/* Triage Section */}
          <section className="mb-10">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Triagem de Documentacao</h2>
                <p className="text-muted-foreground">Gerencie o fluxo de criação de conteúdo técnico e clínico.</p>
              </div>
              <Button onClick={handleCreatePage}>
                <Plus className="mr-2 h-4 w-4" /> Nova Demanda
              </Button>
            </div>
            
            <WikiTriageBoard 
              triageBuckets={triageBuckets}
              onDragEnd={handleTriageDragEnd}
              onOpenPage={handlePageSelect}
              onMoveStatus={handleQuickStatusChange}
              dragEnabled={!hasActiveTriageFilters}
              wipLimits={TRIAGE_WIP_LIMITS}
            />

            <div className="mt-4 rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Histórico de mudanças</p>
              <div className="mt-2 space-y-2 text-xs">
                {triageEvents.length === 0 && <p className="text-muted-foreground">Sem eventos recentes.</p>}
                {triageEvents.slice(0, 6).map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded border px-2 py-1">
                    <span className="truncate">{event.page_title || event.page_id}: {event.from_status} → {event.to_status}</span>
                    <span className="text-muted-foreground">{(event.created_at as any)?.toDate?.()?.toLocaleString('pt-BR') || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Knowledge Hub Section */}
          <KnowledgeHubView 
            knowledgeStats={knowledgeStats}
            knowledgeGroupsFiltered={knowledgeGroupsFiltered}
            filteredKnowledge={filteredKnowledge}
            auditItems={auditItems}
            auditProfiles={queryClient.getQueryData(['knowledge-audit-profiles', []]) || {}}
            semanticScoreMap={semanticScoreMap}
            kbFilters={kbFilters}
            setKbFilters={setKbFilters}
            syncing={syncing}
            indexing={indexing}
            onSync={handleSyncArticles}
            onIndex={handleIndexArticles}
            onEditArticle={openAnnotationDialog}
            onAuditArticle={setAuditArticle}
            articleTitleMap={articleTitleMap}
          />

          {/* Pages Sections */}
          <div className="space-y-8">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar páginas, conteúdo, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Favorites */}
            {favorites.length > 0 && !searchQuery && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" /> Populares
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((page) => (
                    <WikiPageCard key={page.id} page={page} onClick={() => handlePageSelect(page)} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent */}
            {!searchQuery && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" /> Recentes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentPages.map((page) => (
                    <WikiPageCard key={page.id} page={page} onClick={() => handlePageSelect(page)} />
                  ))}
                </div>
              </div>
            )}

            {/* All Pages */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" /> Todas as Páginas
                {filteredPages.length > 0 && <Badge variant="secondary" className="ml-2">{filteredPages.length}</Badge>}
              </h2>

              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando páginas...</div>
              ) : filteredPages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPages.map((page) => (
                    <WikiPageCard key={page.id} page={page} onClick={() => handlePageSelect(page)} onDelete={() => deletePage(page.id)} />
                  ))}
                </div>
              ) : (
                <Card><CardContent className="p-12 text-center text-muted-foreground">Nenhuma página encontrada.</CardContent></Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nova página da Wiki</DialogTitle>
            <DialogDescription>Crie em branco ou aplique um template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Página em branco</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {activeTemplate && (
              <div className="space-y-3 rounded-lg border p-3">
                {activeTemplate.variables.map((v) => (
                  <div key={v.key} className="space-y-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">{v.label}</label>
                    <Input value={templateValues[v.key] ?? ''} onChange={(e) => setTemplateValues(prev => ({ ...prev, [v.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => activeTemplate ? startTemplatePage(activeTemplate) : startBlankPage()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activeArticle)} onOpenChange={(open) => !open && setActiveArticle(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Curadoria de conteudo</DialogTitle>
          </DialogHeader>
          {activeArticle && (
            <div className="space-y-4">
              <p className="font-semibold">{activeArticle.title}</p>
              <div className="flex gap-3">
                <ToggleGroup type="single" value={annotationScope} onValueChange={(v) => v && setAnnotationScope(v as any)}>
                  <ToggleGroupItem value="organization">Equipe</ToggleGroupItem>
                  <ToggleGroupItem value="user">Meu</ToggleGroupItem>
                </ToggleGroup>
                <Select value={annotationStatus} onValueChange={(v) => setAnnotationStatus(v as any)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="review">Em revisao</SelectItem>
                    <SelectItem value="verified">Verificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Textarea value={annotationHighlights} onChange={(e) => setAnnotationHighlights(e.target.value)} placeholder="Destaques..." rows={6} />
                <Textarea value={annotationObservations} onChange={(e) => setAnnotationObservations(e.target.value)} placeholder="Observacoes..." rows={6} />
              </div>
              <Textarea value={annotationNotes} onChange={(e) => setAnnotationNotes(e.target.value)} placeholder="Notas internas..." rows={3} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveArticle(null)}>Cancelar</Button>
            <Button onClick={onSaveAnnotation}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(auditArticle)} onOpenChange={(open) => !open && setAuditArticle(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Auditoria do artigo</DialogTitle></DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {auditArticle && auditItems.filter(e => e.article_id === auditArticle.id).map(e => (
              <div key={e.id} className="rounded-lg border p-3 text-xs">
                <div className="flex justify-between font-medium"><span>{e.action}</span><span>{(e.created_at as any)?.toDate?.()?.toLocaleString()}</span></div>
                <div className="mt-1">Por: {e.actor_id}</div>
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={() => setAuditArticle(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
