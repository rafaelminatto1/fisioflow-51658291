/**
 * Wiki Page - Knowledge Base colaborativa estilo Notion
 * Página principal da wiki com lista de páginas e busca
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import {

  Search,
  Plus,
  FileText,
  Folder,
  Star,
  Clock,
  ArrowLeft,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
  LayoutGrid,
  AlignLeft,
  Share2,
  Sparkles,
  Target,
  ShieldCheck,
  Pencil,
  History,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WikiSidebar } from '@/components/wiki/WikiSidebar';
import { WikiEditor, WikiPageViewer } from '@/components/wiki/WikiEditor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { wikiService } from '@/lib/services/wikiService';
import { knowledgeBaseService } from '@/lib/services/knowledgeBaseService';
import { instantiateTemplate } from '@/features/wiki/templates/templateTransform';
import {
  getTemplateById,
  listTemplateCatalog,
  type WikiTemplateBlueprint,
} from '@/features/wiki/templates/templateCatalog';
import { toast } from 'sonner';
import {
  knowledgeBase,
  knowledgeEvidenceLabels,
  knowledgeGroups,
  type KnowledgeArticle,
  type KnowledgeGroup,
  type EvidenceTier,
} from '@/data/knowledgeBase';
import type {
  KnowledgeAnnotation,
  KnowledgeAuditEntry,
  KnowledgeCuration,
  KnowledgeCurationStatus,
} from '@/types/knowledge-base';

import type { WikiPage } from '@/types/wiki';
import {
  buildTriageDropPlan,
  calculateAverageTimeInColumnDays,
  calculateLeadTimeDays,
  countDoneThisWeek,
  filterTriagePages,
  getTriageStatus,
  sortByTriageOrder,
  type TriageFilters,
  type TriageStatus,
} from '@/features/wiki/triage/triageUtils';

const TRIAGE_WIP_LIMITS: Record<TriageStatus, number> = {
  backlog: 30,
  'in-progress': 10,
  done: 999,
};

function isE2ERuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.location.search.includes('e2e=true') ||
      (typeof navigator !== 'undefined' && navigator.webdriver === true))
  );
}

function getE2ERecentPagesStorageKey(organizationId: string): string {
  return `e2e_recent_wiki_pages_${organizationId}`;
}

function samePageIds(a: WikiPage[], b: WikiPage[]): boolean {
  if (a.length !== b.length) return false;
  const aIds = a.map((page) => page.id).sort();
  const bIds = b.map((page) => page.id).sort();
  return aIds.every((id, index) => id === bIds[index]);
}

export default function WikiPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { user, profile, organizationId } = useAuth();
  const currentOrganizationId = organizationId ?? profile?.organization_id;
  const currentUserId = user?.uid ?? profile?.user_id ?? profile?.id;
  const currentUserName = profile?.full_name ?? user?.displayName ?? user?.email ?? 'Equipe';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isE2E = isE2ERuntime();

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [draftPage, setDraftPage] = useState<Partial<WikiPage> | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [triageTemplateFilter, setTriageTemplateFilter] = useState<string>('all');
  const [triageOwnerFilter, setTriageOwnerFilter] = useState<string>('all');
  const [triageTagFilter, setTriageTagFilter] = useState<string>('');
  const [triageTextFilter, setTriageTextFilter] = useState<string>('');
  const [kbQuery, setKbQuery] = useState('');
  const [kbGroup, setKbGroup] = useState<KnowledgeGroup | 'Todas'>('Todas');
  const [kbEvidence, setKbEvidence] = useState<EvidenceTier | 'Todas'>('Todas');
  const [kbStatus, setKbStatus] = useState<'verified' | 'pending' | 'all'>('all');
  const [kbView, setKbView] = useState<'library' | 'narrative' | 'map'>('library');
  const [kbUseSemantic, setKbUseSemantic] = useState(false);
  const [activeArticle, setActiveArticle] = useState<KnowledgeArticle | null>(null);
  const [annotationScope, setAnnotationScope] = useState<'organization' | 'user'>('organization');
  const [annotationHighlights, setAnnotationHighlights] = useState('');
  const [annotationObservations, setAnnotationObservations] = useState('');
  const [annotationStatus, setAnnotationStatus] = useState<KnowledgeCurationStatus>('pending');
  const [annotationNotes, setAnnotationNotes] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [auditArticle, setAuditArticle] = useState<KnowledgeArticle | null>(null);

  const templates = useMemo(() => listTemplateCatalog(), []);
  const activeTemplate = useMemo(
    () => (selectedTemplateId === 'blank' ? null : getTemplateById(selectedTemplateId)),
    [selectedTemplateId]
  );

  // Query para páginas wiki (Firestore wiki_pages)
  const { data: rawPages = [], isLoading } = useQuery({
    queryKey: ['wiki-pages', currentOrganizationId],
    queryFn: () => (currentOrganizationId ? wikiService.listPages(currentOrganizationId) : Promise.resolve([])),
    enabled: !!currentOrganizationId,
  });
  const [recoveredPages, setRecoveredPages] = useState<WikiPage[]>([]);
  const rawPagesSignature = useMemo(() => rawPages.map((page) => page.id).sort().join('|'), [rawPages]);

  const pages = useMemo(() => {
    const map = new Map<string, WikiPage>();
    rawPages.forEach((page) => map.set(page.id, page));
    recoveredPages.forEach((page) => map.set(page.id, page));

    const merged = Array.from(map.values());
    const getTime = (page: WikiPage) =>
      page.updated_at && typeof (page.updated_at as { toDate?: () => Date }).toDate === 'function'
        ? (page.updated_at as { toDate: () => Date }).toDate().getTime()
        : 0;
    merged.sort((a, b) => getTime(b) - getTime(a));
    return merged;
  }, [rawPages, recoveredPages]);

  useEffect(() => {
    if (!currentOrganizationId) {
      setRecoveredPages((previous) => (previous.length === 0 ? previous : []));
      return;
    }

    let cancelled = false;

    const hydrateRecentPages = async () => {
      if (typeof window === 'undefined') return;
      const key = getE2ERecentPagesStorageKey(currentOrganizationId);
      const raw = window.sessionStorage.getItem(key);
      if (!raw) {
        if (!cancelled) {
          setRecoveredPages((previous) => (previous.length === 0 ? previous : []));
        }
        return;
      }

      let ids: string[] = [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) ids = parsed.filter((id): id is string => typeof id === 'string');
      } catch {
        ids = [];
      }

      if (ids.length === 0) {
        if (!cancelled) {
          setRecoveredPages((previous) => (previous.length === 0 ? previous : []));
        }
        return;
      }

      const existingIds = new Set(rawPages.map((page) => page.id));
      const missingIds = ids.filter((id) => !existingIds.has(id));
      if (missingIds.length === 0) {
        if (!cancelled) {
          setRecoveredPages((previous) => (previous.length === 0 ? previous : []));
        }
        return;
      }

      const recovered = (
        await Promise.all(missingIds.slice(0, 20).map((id) => wikiService.getPageById(currentOrganizationId, id)))
      ).filter((page): page is WikiPage => Boolean(page));

      if (!cancelled) {
        setRecoveredPages((previous) => (samePageIds(previous, recovered) ? previous : recovered));
      }
    };

    hydrateRecentPages();
    return () => {
      cancelled = true;
    };
  }, [currentOrganizationId, rawPagesSignature, isE2E]);

  // Query para categorias (Firestore wiki_categories)
  const { data: categories = [] } = useQuery({
    queryKey: ['wiki-categories', currentOrganizationId],
    queryFn: () => (currentOrganizationId ? wikiService.listCategories(currentOrganizationId) : Promise.resolve([])),
    enabled: !!currentOrganizationId,
  });

  const { data: templateUsageStats = {} } = useQuery({
    queryKey: ['wiki-template-usage', currentOrganizationId],
    queryFn: () => (currentOrganizationId ? wikiService.getTemplateUsageStats(currentOrganizationId) : Promise.resolve({})),
    enabled: !!currentOrganizationId,
  });

  const { data: triageEvents = [] } = useQuery({
    queryKey: ['wiki-triage-events', currentOrganizationId],
    queryFn: () => (currentOrganizationId ? wikiService.listTriageEvents(currentOrganizationId, 20) : Promise.resolve([])),
    enabled: !!currentOrganizationId,
  });

  const { data: knowledgeAnnotations = [] } = useQuery({
    queryKey: ['knowledge-annotations', currentOrganizationId, currentUserId],
    queryFn: () =>
      currentOrganizationId
        ? knowledgeBaseService.listAnnotations(currentOrganizationId, currentUserId)
        : Promise.resolve([]),
    enabled: !!currentOrganizationId,
  });

  const { data: knowledgeCuration = [] } = useQuery({
    queryKey: ['knowledge-curation', currentOrganizationId],
    queryFn: () =>
      currentOrganizationId ? knowledgeBaseService.listCuration(currentOrganizationId) : Promise.resolve([]),
    enabled: !!currentOrganizationId,
  });

  const { data: knowledgeAudit = [] } = useQuery({
    queryKey: ['knowledge-audit', currentOrganizationId],
    queryFn: () =>
      currentOrganizationId ? knowledgeBaseService.listAudit(currentOrganizationId) : Promise.resolve([]),
    enabled: !!currentOrganizationId,
  });

  const { data: knowledgeArticles = [] } = useQuery({
    queryKey: ['knowledge-articles', currentOrganizationId],
    queryFn: () =>
      currentOrganizationId ? knowledgeBaseService.listArticles(currentOrganizationId) : Promise.resolve([]),
    enabled: !!currentOrganizationId,
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

  const knowledgeStats = useMemo(() => {
    const source = knowledgeArticles.length > 0 ? knowledgeArticles : knowledgeBase;
    const total = source.length;
    const verified = source.filter((item) => item.status === 'verified').length;
    const byGroup = knowledgeGroups.reduce<Record<string, number>>((acc, group) => {
      acc[group.id] = source.filter((item) => item.group === group.id).length;
      return acc;
    }, {});
    return { total, verified, byGroup };
  }, [knowledgeArticles]);

  const annotationMap = useMemo(() => {
    const org = new Map<string, KnowledgeAnnotation>();
    const userMap = new Map<string, KnowledgeAnnotation>();
    knowledgeAnnotations.forEach((entry) => {
      if (entry.scope === 'user') {
        userMap.set(entry.article_id, entry);
      } else {
        org.set(entry.article_id, entry);
      }
    });
    return { org, user: userMap };
  }, [knowledgeAnnotations]);

  const curationMap = useMemo(() => {
    const map = new Map<string, KnowledgeCuration>();
    knowledgeCuration.forEach((entry) => map.set(entry.article_id, entry));
    return map;
  }, [knowledgeCuration]);

  const mergedKnowledge = useMemo(() => {
    const source = knowledgeArticles.length > 0 ? knowledgeArticles : knowledgeBase;
    return source.map((item) => {
      const orgAnnotation = annotationMap.org.get(item.id);
      const userAnnotation = annotationMap.user.get(item.id);
      const curation = curationMap.get(item.id);
      return {
        ...item,
        highlights: userAnnotation?.highlights?.length
          ? userAnnotation.highlights
          : orgAnnotation?.highlights?.length
            ? orgAnnotation.highlights
            : item.highlights,
        observations: userAnnotation?.observations?.length
          ? userAnnotation.observations
          : orgAnnotation?.observations?.length
            ? orgAnnotation.observations
            : item.observations,
        status: (curation?.status || orgAnnotation?.status || item.status) as KnowledgeArticle['status'],
        evidence: (orgAnnotation?.evidence || item.evidence) as KnowledgeArticle['evidence'],
      };
    });
  }, [annotationMap, curationMap, knowledgeArticles]);

  const { data: semanticResults = [] } = useQuery({
    queryKey: ['knowledge-semantic', currentOrganizationId, kbQuery],
    queryFn: () =>
      currentOrganizationId
        ? knowledgeBaseService.semanticSearch({
            query: kbQuery,
            organizationId: currentOrganizationId,
            limit: 40,
          })
        : Promise.resolve([]),
    enabled: kbUseSemantic && kbQuery.trim().length > 2 && !!currentOrganizationId,
  });

  const semanticOrdered = useMemo(() => {
    if (!kbUseSemantic || kbQuery.trim().length <= 2) return mergedKnowledge;
    const byId = new Map(mergedKnowledge.map((item) => [item.id, item]));
    return semanticResults
      .map((result) => byId.get(result.article_id))
      .filter((item): item is KnowledgeArticle => Boolean(item));
  }, [kbUseSemantic, kbQuery, mergedKnowledge, semanticResults]);

  const filteredKnowledge = useMemo(() => {
    return semanticOrdered.filter((item) => {
      if (kbGroup !== 'Todas' && item.group !== kbGroup) return false;
      if (kbEvidence !== 'Todas' && item.evidence !== kbEvidence) return false;
      if (kbStatus !== 'all') {
        if (kbStatus === 'verified' && item.status !== 'verified') return false;
        if (kbStatus === 'pending' && item.status === 'verified') return false;
      }
      if (!kbQuery || kbUseSemantic) return true;
      const query = kbQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.subgroup.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [semanticOrdered, kbGroup, kbEvidence, kbStatus, kbQuery, kbUseSemantic]);

  const knowledgeGroupsFiltered = useMemo(() => {
    const map = new Map<string, KnowledgeArticle[]>();
    filteredKnowledge.forEach((item) => {
      const key = `${item.group}__${item.subgroup}`;
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    });
    return map;
  }, [filteredKnowledge]);

  const auditItems = useMemo(() => {
    const getTime = (value?: KnowledgeAuditEntry['created_at']) => {
      if (!value) return 0;
      const maybeDate = (value as { toDate?: () => Date }).toDate?.();
      return maybeDate ? maybeDate.getTime() : 0;
    };
    return [...knowledgeAudit]
      .sort((a, b) => getTime(b.created_at) - getTime(a.created_at))
      .slice(0, 8);
  }, [knowledgeAudit]);

  const auditActorIds = useMemo(() => {
    return Array.from(new Set(knowledgeAudit.map((entry) => entry.actor_id).filter(Boolean)));
  }, [knowledgeAudit]);

  const { data: auditProfiles = {} } = useQuery({
    queryKey: ['knowledge-audit-profiles', auditActorIds],
    queryFn: () => knowledgeBaseService.getProfilesByIds(auditActorIds),
    enabled: auditActorIds.length > 0,
  });

  const semanticScoreMap = useMemo(() => {
    const map = new Map<string, number>();
    semanticResults.forEach((result) => map.set(result.article_id, result.score));
    return map;
  }, [semanticResults]);

  const articleTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    const source = knowledgeArticles.length > 0 ? knowledgeArticles : knowledgeBase;
    source.forEach((item) => map.set(item.id, item.title));
    return map;
  }, [knowledgeArticles]);

  const getTimestampMillis = (value: unknown): number => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === 'function') return maybeTimestamp.toDate().getTime();
    return 0;
  };

  // Páginas favoritas e recentes
  const favorites = useMemo(() => pages.filter((p) => p.view_count > 10).slice(0, 5), [pages]);
  const recentPages = useMemo(
    () =>
      [...pages]
        .sort((a, b) => getTimestampMillis(b.updated_at) - getTimestampMillis(a.updated_at))
        .slice(0, 5),
    [pages]
  );

  const triageTemplates = useMemo(
    () => templates.filter((template) =>
      template.id === 'incident-postmortem-v1' ||
      template.id === 'meeting-notes-v1' ||
      template.id === 'product-prd-v1'
    ),
    [templates]
  );

  const triagePages = useMemo(
    () =>
      pages.filter((page) => page.category === 'triage' || page.tags.includes('triage')),
    [pages]
  );

  const triageFilters = useMemo<TriageFilters>(
    () => ({
      templateId: triageTemplateFilter,
      ownerId: triageOwnerFilter,
      tagQuery: triageTagFilter,
      textQuery: triageTextFilter,
    }),
    [triageTemplateFilter, triageOwnerFilter, triageTagFilter, triageTextFilter]
  );

  const filteredTriagePages = useMemo(
    () => filterTriagePages(triagePages, triageFilters),
    [triagePages, triageFilters]
  );

  const triageBuckets = useMemo<Record<TriageStatus, WikiPage[]>>(() => {
    const buckets = {
      backlog: [] as WikiPage[],
      'in-progress': [] as WikiPage[],
      done: [] as WikiPage[],
    };

    filteredTriagePages.forEach((page) => {
      const status = getTriageStatus(page);
      buckets[status].push(page);
    });

    buckets.backlog.sort(sortByTriageOrder);
    buckets['in-progress'].sort(sortByTriageOrder);
    buckets.done.sort(sortByTriageOrder);

    return buckets;
  }, [filteredTriagePages]);

  const allTriageBuckets = useMemo<Record<TriageStatus, WikiPage[]>>(() => {
    const buckets = {
      backlog: [] as WikiPage[],
      'in-progress': [] as WikiPage[],
      done: [] as WikiPage[],
    };

    triagePages.forEach((page) => {
      buckets[getTriageStatus(page)].push(page);
    });
    buckets.backlog.sort(sortByTriageOrder);
    buckets['in-progress'].sort(sortByTriageOrder);
    buckets.done.sort(sortByTriageOrder);
    return buckets;
  }, [triagePages]);

  const triageOwnerOptions = useMemo(
    () => Array.from(new Set(triagePages.map((page) => page.created_by).filter(Boolean))).sort(),
    [triagePages]
  );

  const hasActiveTriageFilters = useMemo(
    () =>
      triageTemplateFilter !== 'all' ||
      triageOwnerFilter !== 'all' ||
      triageTagFilter.trim().length > 0 ||
      triageTextFilter.trim().length > 0,
    [triageTemplateFilter, triageOwnerFilter, triageTagFilter, triageTextFilter]
  );

  const triageMetrics = useMemo(() => {
    const avgBacklog = calculateAverageTimeInColumnDays(triagePages, 'backlog');
    const avgInProgress = calculateAverageTimeInColumnDays(triagePages, 'in-progress');
    const avgDone = calculateAverageTimeInColumnDays(triagePages, 'done');
    const leadTime = calculateLeadTimeDays(triagePages);
    const doneThisWeek = countDoneThisWeek(triagePages);
    return { avgBacklog, avgInProgress, avgDone, leadTime, doneThisWeek };
  }, [triagePages]);

  const wipAlerts = useMemo(
    () => ({
      backlog: triageBuckets.backlog.length > TRIAGE_WIP_LIMITS.backlog,
      'in-progress': triageBuckets['in-progress'].length > TRIAGE_WIP_LIMITS['in-progress'],
      done: triageBuckets.done.length > TRIAGE_WIP_LIMITS.done,
    }),
    [triageBuckets]
  );

  const buildTriageEventPayloads = (
    updates: Array<{ id: string; triage_order: number; tags: string[] }>,
    source: 'drag' | 'quick-action',
    reason?: string
  ) => {
    const beforeMap = new Map(triagePages.map((page) => [page.id, page]));
    return updates
      .map((update) => {
        const before = beforeMap.get(update.id);
        if (!before) return null;

        const fromStatus = getTriageStatus(before);
        const afterStatus = getTriageStatus({ tags: update.tags } as Pick<WikiPage, 'tags'>);
        if (fromStatus === afterStatus) return null;

        return {
          page_id: before.id,
          page_title: before.title,
          template_id: before.template_id,
          from_status: fromStatus,
          to_status: afterStatus,
          previous_order: before.triage_order,
          next_order: update.triage_order,
          source,
          reason,
        };
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event));
  };

  const handleTriageDragEnd = async (result: DropResult) => {
    if (!currentOrganizationId || !currentUserId) return;
    if (!result.destination) return;
    if (hasActiveTriageFilters) {
      toast.error('Desative os filtros para reordenar o board.');
      return;
    }

    const sourceStatus = result.source.droppableId as TriageStatus;
    const destinationStatus = result.destination.droppableId as TriageStatus;
    if (sourceStatus === destinationStatus && result.source.index === result.destination.index) return;

    try {
      const updates = buildTriageDropPlan({
        draggableId: result.draggableId,
        sourceStatus,
        destinationStatus,
        destinationIndex: result.destination.index,
        buckets: triageBuckets,
      });
      if (updates.length === 0) return;

      await wikiService.updateTriageOrdering(
        currentOrganizationId,
        currentUserId,
        updates
      );
      const events = buildTriageEventPayloads(updates, 'drag', 'card-moved');
      await wikiService.recordTriageEvents(currentOrganizationId, currentUserId, events);

      await queryClient.invalidateQueries({ queryKey: ['wiki-pages', currentOrganizationId] });
      await queryClient.invalidateQueries({ queryKey: ['wiki-triage-events', currentOrganizationId] });
      toast.success('Triagem atualizada.');
    } catch (error) {
      console.error('Erro ao mover card da triagem:', error);
      toast.error('Não foi possível atualizar o status da triagem.');
    }
  };

  const handleQuickStatusChange = async (page: WikiPage, destinationStatus: TriageStatus) => {
    if (!currentOrganizationId || !currentUserId) return;
    const sourceStatus = getTriageStatus(page);
    if (sourceStatus === destinationStatus) return;

    const updates = buildTriageDropPlan({
      draggableId: page.id,
      sourceStatus,
      destinationStatus,
      destinationIndex: allTriageBuckets[destinationStatus].length,
      buckets: allTriageBuckets,
    });

    if (updates.length === 0) return;

    try {
      await wikiService.updateTriageOrdering(currentOrganizationId, currentUserId, updates);
      const events = buildTriageEventPayloads(updates, 'quick-action', 'quick-status-change');
      await wikiService.recordTriageEvents(currentOrganizationId, currentUserId, events);
      await queryClient.invalidateQueries({ queryKey: ['wiki-pages', currentOrganizationId] });
      await queryClient.invalidateQueries({ queryKey: ['wiki-triage-events', currentOrganizationId] });
      toast.success('Status atualizado.');
    } catch (error) {
      console.error('Erro ao atualizar status rápido:', error);
      toast.error('Não foi possível atualizar o status.');
    }
  };

  useEffect(() => {
    if (!slug) {
      setSelectedPage(null);
      return;
    }

    const pageFromSlug = pages.find((page) => page.slug === slug) ?? null;
    setSelectedPage(pageFromSlug);
  }, [pages, slug]);

  const resetTemplateWizard = () => {
    setSelectedTemplateId('blank');
    setTemplateValues({});
  };

  const startBlankPage = () => {
    setDraftPage(null);
    setSelectedPage(null);
    setIsTemplateDialogOpen(false);
    setIsEditing(true);
  };

  const buildTriageTags = (templateId: string): string[] => {
    const base = ['triage', 'triage-backlog'];
    if (templateId.includes('incident')) return [...base, 'incident'];
    if (templateId.includes('meeting')) return [...base, 'ata'];
    if (templateId.includes('prd')) return [...base, 'prd'];
    return base;
  };

  const startTemplatePage = (template: WikiTemplateBlueprint, overrides: Record<string, string> = {}) => {
    try {
      const instantiated = instantiateTemplate({
        templateId: template.id,
        values: { ...templateValues, ...overrides },
      });

      if (instantiated.missingRequired.length > 0) {
        toast.error(`Campos obrigatórios ausentes: ${instantiated.missingRequired.join(', ')}`);
        return;
      }

      const lines = instantiated.content.split('\n');
      const derivedTitle = lines[0]?.replace(/^#\s*/, '').trim() || template.name;
      const isTriageTemplate = template.id === 'incident-postmortem-v1' || template.id === 'meeting-notes-v1' || template.id === 'product-prd-v1';
      const nextTriageOrder = triagePages.filter((page) => getTriageStatus(page) === 'backlog').length + 1;

      setDraftPage({
        title: derivedTitle,
        content: instantiated.content,
        html_content: undefined,
        category: isTriageTemplate ? 'triage' : template.domain,
        tags: isTriageTemplate ? buildTriageTags(template.id) : template.tags,
        is_published: true,
        template_id: template.id,
        triage_order: isTriageTemplate ? nextTriageOrder : undefined,
      });
      setSelectedPage(null);
      setIsTemplateDialogOpen(false);
      setIsEditing(true);
    } catch (error) {
      console.error('Erro ao instanciar template:', error);
      toast.error('Não foi possível aplicar o template selecionado.');
    }
  };

  const handleCreatePage = () => {
    setSelectedPage(null);
    setDraftPage(null);
    resetTemplateWizard();
    setIsTemplateDialogOpen(true);
  };

  const handlePageSelect = (page: WikiPage) => {
    setSelectedPage(page);
    navigate(`/wiki-workspace/${page.slug}`);
  };

  const handleEdit = () => {
    setDraftPage(null);
    setIsEditing(true);
  };

  const openAnnotationDialog = (article: KnowledgeArticle) => {
    setActiveArticle(article);
    setAnnotationScope('organization');
    setAnnotationStatus((curationMap.get(article.id)?.status as KnowledgeCurationStatus) || 'pending');
    setAnnotationNotes(curationMap.get(article.id)?.notes || '');
    const orgAnnotation = annotationMap.org.get(article.id);
    setAnnotationHighlights((orgAnnotation?.highlights || article.highlights).join('\n'));
    setAnnotationObservations((orgAnnotation?.observations || article.observations).join('\n'));
  };

  useEffect(() => {
    if (!activeArticle) return;
    const currentAnnotation =
      annotationScope === 'user'
        ? annotationMap.user.get(activeArticle.id)
        : annotationMap.org.get(activeArticle.id);
    setAnnotationHighlights((currentAnnotation?.highlights || activeArticle.highlights).join('\n'));
    setAnnotationObservations((currentAnnotation?.observations || activeArticle.observations).join('\n'));
  }, [annotationScope, activeArticle, annotationMap]);

  const handleSaveAnnotation = async () => {
    if (!currentOrganizationId || !currentUserId || !activeArticle) return;
    try {
      const highlights = annotationHighlights
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const observations = annotationObservations
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      await knowledgeBaseService.upsertAnnotation({
        organizationId: currentOrganizationId,
        userId: currentUserId,
        articleId: activeArticle.id,
        scope: annotationScope,
        highlights,
        observations,
      });

      await knowledgeBaseService.updateCuration({
        organizationId: currentOrganizationId,
        userId: currentUserId,
        articleId: activeArticle.id,
        status: annotationStatus,
        notes: annotationNotes,
      });

      await knowledgeBaseService.addAuditEntry({
        article_id: activeArticle.id,
        organization_id: currentOrganizationId,
        actor_id: currentUserId,
        action: 'update_annotation',
        after: {
          scope: annotationScope,
          highlights,
          observations,
          status: annotationStatus,
          notes: annotationNotes,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['knowledge-annotations', currentOrganizationId, currentUserId] });
      await queryClient.invalidateQueries({ queryKey: ['knowledge-curation', currentOrganizationId] });
      toast.success('Curadoria atualizada.');
      setActiveArticle(null);
    } catch (error) {
      console.error('Erro ao salvar curadoria:', error);
      toast.error('Nao foi possivel salvar as alteracoes.');
    }
  };

  const handleSave = async (data: Omit<WikiPage, 'id' | 'created_at' | 'updated_at' | 'version'>) => {
    if (!currentUserId || !currentOrganizationId) return;
    const saveTraceId = `wiki-save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      if (isE2E) {
        console.info(
          '[E2E][Wiki][handleSave:start]',
          JSON.stringify({
            traceId: saveTraceId,
            title: data.title,
            slug: data.slug,
            template_id: data.template_id ?? null,
            tags: data.tags ?? [],
            category: data.category ?? null,
            organization_id: currentOrganizationId,
            user_id: currentUserId,
            selected_page_id: selectedPage?.id ?? null,
          })
        );
      }

      const savedPageId = await wikiService.savePage(
        currentOrganizationId,
        currentUserId,
        data,
        selectedPage ? { id: selectedPage.id, version: selectedPage.version } : undefined
      );

      if (typeof window !== 'undefined') {
        const key = getE2ERecentPagesStorageKey(currentOrganizationId);
        const currentRaw = window.sessionStorage.getItem(key);
        let ids: string[] = [];
        try {
          const parsed = currentRaw ? JSON.parse(currentRaw) : [];
          if (Array.isArray(parsed)) ids = parsed.filter((id): id is string => typeof id === 'string');
        } catch {
          ids = [];
        }
        const next = [savedPageId, ...ids.filter((id) => id !== savedPageId)].slice(0, 30);
        window.sessionStorage.setItem(key, JSON.stringify(next));
      }

      const refreshedPages = await queryClient.fetchQuery({
        queryKey: ['wiki-pages', currentOrganizationId],
        queryFn: () => wikiService.listPages(currentOrganizationId),
      });

      const savedPageFromList =
        refreshedPages.find((page) => page.id === savedPageId) ??
        refreshedPages.find((page) => page.slug === data.slug);
      const savedPageFromId = savedPageFromList ? null : await wikiService.getPageById(currentOrganizationId, savedPageId);
      const savedPageFromSlug =
        savedPageFromList || savedPageFromId ? null : await wikiService.getPageBySlug(currentOrganizationId, data.slug);
      const savedPage = savedPageFromList ?? savedPageFromId ?? savedPageFromSlug ?? null;

      if (isE2E) {
        console.info(
          '[E2E][Wiki][handleSave:afterFetch]',
          JSON.stringify({
            traceId: saveTraceId,
            saved_page_id: savedPageId,
            found_saved_page: !!savedPage,
            resolved_slug: savedPage?.slug ?? null,
            refreshed_count: refreshedPages.length,
            fallback_from_id: !!savedPageFromId,
            fallback_from_slug: !!savedPageFromSlug,
          })
        );
      }

      setSelectedPage(savedPage);
      setDraftPage(null);
      setIsEditing(false);
      const fallbackSlug = (data.slug?.trim() || data.title.toLowerCase())
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-');

      if (savedPage) {
        navigate(`/wiki-workspace/${savedPage.slug}`);
      } else {
        navigate(`/wiki-workspace/${fallbackSlug}`);
      }

      if (isE2E) {
        console.info(
          '[E2E][Wiki][handleSave:navigate]',
          JSON.stringify({
            traceId: saveTraceId,
            target_path: savedPage ? `/wiki-workspace/${savedPage.slug}` : `/wiki-workspace/${fallbackSlug}`,
          })
        );
      }

      toast.success('Página salva com sucesso.');
    } catch (err) {
      if (isE2E) {
        console.error(
          '[E2E][Wiki][handleSave:error]',
          JSON.stringify({
            traceId: saveTraceId,
            title: data.title,
            slug: data.slug,
            organization_id: currentOrganizationId,
            user_id: currentUserId,
            error: err instanceof Error ? err.message : String(err),
          })
        );
      }
      console.error('Erro ao salvar página wiki:', err);
      toast.error('Não foi possível salvar a página.');
    }
  };

  const handleSyncArticles = async () => {
    if (!currentOrganizationId || !currentUserId) return;
    try {
      setSyncing(true);
      await knowledgeBaseService.syncArticles({
        organizationId: currentOrganizationId,
        userId: currentUserId,
        articles: knowledgeBase,
      });
      toast.success('Base sincronizada com Firestore.');
    } catch (error) {
      console.error('Erro ao sincronizar base:', error);
      toast.error('Nao foi possivel sincronizar a base.');
    } finally {
      setSyncing(false);
    }
  };

  const handleIndexArticles = async () => {
    if (!currentOrganizationId) return;
    try {
      setIndexing(true);
      const result = await knowledgeBaseService.indexKnowledgeArticles({ organizationId: currentOrganizationId });
      toast.success(`Indexacao concluida: ${result.indexed} itens.`);
    } catch (error) {
      console.error('Erro ao indexar base:', error);
      toast.error('Nao foi possivel indexar a base.');
    } finally {
      setIndexing(false);
    }
  };

  // Se está editando, mostrar editor
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
              <Button onClick={handleCreatePage} data-testid="create-wiki-page-button">
                <Plus className="w-4 h-4 mr-2" />
                Nova Página
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          <section className="mb-6 rounded-xl border bg-background p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Triagem operacional</h2>
                <p className="text-sm text-muted-foreground">
                  Fluxo estilo Linear com criação rápida por template e acompanhamento por status.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasActiveTriageFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTriageTemplateFilter('all');
                      setTriageOwnerFilter('all');
                      setTriageTagFilter('');
                      setTriageTextFilter('');
                    }}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  >
                    Limpar filtros
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/wiki/template-analytics')}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Template Analytics
                </Button>
                {triageTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      startTemplatePage(template, {
                        feature_name: 'Nova iniciativa',
                        owner: currentUserName || user?.email || 'Equipe',
                        incident_title: 'Novo incidente',
                        date: new Date().toISOString().slice(0, 10),
                        meeting_title: 'Nova reunião',
                        facilitator: currentUserName || 'Facilitador',
                      })
                    }
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Template</label>
                <Select value={triageTemplateFilter} onValueChange={setTriageTemplateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="incident-postmortem-v1">Incidente</SelectItem>
                    <SelectItem value="meeting-notes-v1">Ata</SelectItem>
                    <SelectItem value="product-prd-v1">PRD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Responsável</label>
                <Select value={triageOwnerFilter} onValueChange={setTriageOwnerFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {triageOwnerOptions.map((ownerId) => (
                      <SelectItem key={ownerId} value={ownerId}>
                        {ownerId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tag</label>
                <Input
                  value={triageTagFilter}
                  onChange={(event) => setTriageTagFilter(event.target.value)}
                  placeholder="incident, ata, prd..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Texto</label>
                <Input
                  value={triageTextFilter}
                  onChange={(event) => setTriageTextFilter(event.target.value)}
                  placeholder="buscar no título/conteúdo..."
                />
              </div>
            </div>
            {hasActiveTriageFilters && (
              <p className="mt-2 text-xs text-amber-600">
                Filtros ativos: o board fica em modo leitura. Limpe os filtros para reordenar por drag-and-drop.
              </p>
            )}
            {wipAlerts['in-progress'] && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Limite WIP excedido em Em execução ({triageBuckets['in-progress'].length}/{TRIAGE_WIP_LIMITS['in-progress']}).
              </div>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Backlog</p>
                  <p className="mt-1 text-2xl font-semibold">{triageBuckets.backlog.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Em execução</p>
                  <p className="mt-1 text-2xl font-semibold">{triageBuckets['in-progress'].length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Concluídos</p>
                  <p className="mt-1 text-2xl font-semibold">{triageBuckets.done.length}</p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Média em backlog</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {triageMetrics.avgBacklog > 0 ? `${triageMetrics.avgBacklog}d` : '-'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Média em execução</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {triageMetrics.avgInProgress > 0 ? `${triageMetrics.avgInProgress}d` : '-'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Lead time médio</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {triageMetrics.leadTime > 0 ? `${triageMetrics.leadTime}d` : '-'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Média em concluído</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {triageMetrics.avgDone > 0 ? `${triageMetrics.avgDone}d` : '-'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Throughput semanal</p>
                  <p className="mt-1 text-2xl font-semibold">{triageMetrics.doneThisWeek}</p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-3 rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Uso por template</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">Incidente: {templateUsageStats['incident-postmortem-v1'] || 0}</Badge>
                <Badge variant="outline">Ata: {templateUsageStats['meeting-notes-v1'] || 0}</Badge>
                <Badge variant="outline">PRD: {templateUsageStats['product-prd-v1'] || 0}</Badge>
              </div>
            </div>
            <div className="mt-4">
              <DragDropContext onDragEnd={handleTriageDragEnd}>
                <div className="grid gap-3 md:grid-cols-3">
                  <TriageColumn
                    droppableId="backlog"
                    title="Backlog"
                    pages={triageBuckets.backlog}
                    onOpenPage={handlePageSelect}
                    dragEnabled={!hasActiveTriageFilters}
                    onMoveStatus={handleQuickStatusChange}
                    wipLimit={TRIAGE_WIP_LIMITS.backlog}
                  />
                  <TriageColumn
                    droppableId="in-progress"
                    title="Em execução"
                    pages={triageBuckets['in-progress']}
                    onOpenPage={handlePageSelect}
                    dragEnabled={!hasActiveTriageFilters}
                    onMoveStatus={handleQuickStatusChange}
                    wipLimit={TRIAGE_WIP_LIMITS['in-progress']}
                  />
                  <TriageColumn
                    droppableId="done"
                    title="Concluído"
                    pages={triageBuckets.done}
                    onOpenPage={handlePageSelect}
                    dragEnabled={!hasActiveTriageFilters}
                    onMoveStatus={handleQuickStatusChange}
                    wipLimit={TRIAGE_WIP_LIMITS.done}
                  />
                </div>
              </DragDropContext>
            </div>
            <div className="mt-4 rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Histórico de mudanças</p>
              <div className="mt-2 space-y-2 text-xs">
                {triageEvents.length === 0 && (
                  <p className="text-muted-foreground">Sem eventos recentes.</p>
                )}
                {triageEvents.slice(0, 6).map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded border px-2 py-1">
                    <span className="truncate">
                      {event.page_title || event.page_id}: {event.from_status} → {event.to_status}
                    </span>
                    <span className="text-muted-foreground">
                      {(event.created_at as { toDate?: () => Date }).toDate?.()?.toLocaleString('pt-BR') || '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Knowledge Hub */}
          <section className="mb-10">
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 text-white p-6 md:p-8">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_20%_20%,#34d399,transparent_45%),radial-gradient(circle_at_80%_20%,#38bdf8,transparent_35%),radial-gradient(circle_at_50%_80%,#f59e0b,transparent_35%)]" />
              <div className="relative z-10 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em]">
                    <Sparkles className="h-3 w-3" />
                    Base clinica nivel ouro
                  </div>
                  <h2 className="text-2xl md:text-3xl font-semibold">
                    Guia avancado de protocolos e diretrizes para fisioterapia ortopedica e esportiva
                  </h2>
                  <p className="text-sm md:text-base text-white/80 max-w-xl">
                    Estruture o raciocinio clinico com fontes rastreaveis, organizadas por grupos e subgrupos.
                    Use os modos de visualizacao para navegar, estudar e anotar pontos criticos.
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-white/70">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1">
                      <Target className="h-3 w-3" />
                      {knowledgeStats.total} itens no radar
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1">
                      <ShieldCheck className="h-3 w-3" />
                      {knowledgeStats.verified} verificados
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-3">Distribuicao por grupo</p>
                  <div className="space-y-3 text-sm">
                    {knowledgeGroups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between">
                        <span className="text-white/80">{group.label}</span>
                        <span className="text-white font-semibold">{knowledgeStats.byGroup[group.id]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="rounded-xl border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">Mapa rapido de curadoria</h3>
                      <p className="text-xs text-muted-foreground">
                        Selecione o grupo e o modo de leitura.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={handleSyncArticles} disabled={syncing}>
                        {syncing ? 'Sincronizando...' : 'Sincronizar base'}
                      </Button>
                      <Button variant="default" size="sm" onClick={handleIndexArticles} disabled={indexing}>
                        {indexing ? 'Indexando...' : 'Indexar semantica'}
                      </Button>
                    </div>
                    <ToggleGroup
                      type="single"
                      value={kbView}
                      onValueChange={(value) => value && setKbView(value as typeof kbView)}
                      className="flex flex-wrap gap-2"
                    >
                      <ToggleGroupItem value="library" aria-label="Biblioteca">
                        <LayoutGrid className="h-4 w-4 mr-2" />
                        Biblioteca
                      </ToggleGroupItem>
                      <ToggleGroupItem value="narrative" aria-label="Narrativa">
                        <AlignLeft className="h-4 w-4 mr-2" />
                        Narrativa
                      </ToggleGroupItem>
                      <ToggleGroupItem value="map" aria-label="Mapa">
                        <Share2 className="h-4 w-4 mr-2" />
                        Mapa
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.6fr]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar diretrizes, subgrupos, tags..."
                        value={kbQuery}
                        onChange={(e) => setKbQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch checked={kbUseSemantic} onCheckedChange={setKbUseSemantic} />
                        Busca semantica
                      </div>
                      <ToggleGroup
                        type="single"
                        value={kbStatus}
                        onValueChange={(value) => value && setKbStatus(value as typeof kbStatus)}
                        className="flex gap-2"
                      >
                        <ToggleGroupItem value="verified">Verificados</ToggleGroupItem>
                        <ToggleGroupItem value="pending">Pendentes</ToggleGroupItem>
                        <ToggleGroupItem value="all">Todos</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-background p-4">
                  <Tabs value={kbGroup} onValueChange={(value) => setKbGroup(value as typeof kbGroup)}>
                    <TabsList className="flex flex-wrap gap-2 h-auto bg-transparent p-0">
                      <TabsTrigger value="Todas">Todas</TabsTrigger>
                      {knowledgeGroups.map((group) => (
                        <TabsTrigger key={group.id} value={group.id}>
                          {group.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(['CPG', 'Consensus', 'Guideline', 'SystematicReview', 'PositionStatement', 'Protocol'] as EvidenceTier[]).map(
                      (tier) => (
                        <Button
                          key={tier}
                          type="button"
                          variant={kbEvidence === tier ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setKbEvidence(kbEvidence === tier ? 'Todas' : tier)}
                        >
                          {knowledgeEvidenceLabels[tier]}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4 space-y-4">
                <h3 className="text-base font-semibold">Prioridades da equipe</h3>
                <div className="grid gap-3">
                  {knowledgeGroups.map((group) => (
                    <div key={group.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{group.label}</span>
                        <Badge variant="secondary">{knowledgeStats.byGroup[group.id]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{group.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Auditoria recente</h3>
                  <Badge variant="outline">{knowledgeAudit.length}</Badge>
                </div>
                <div className="space-y-3 text-xs text-muted-foreground">
                  {auditItems.length === 0 && (
                    <p>Nenhuma atividade registrada ainda.</p>
                  )}
                  {auditItems.map((entry) => {
                    const title = articleTitleMap.get(entry.article_id) || entry.article_id;
                    const date = (entry.created_at as { toDate?: () => Date }).toDate?.();
                    const actorName = auditProfiles[entry.actor_id]?.full_name || entry.actor_id;
                    return (
                      <div key={entry.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{title}</span>
                          <Badge variant="secondary">{entry.action}</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span>Responsavel: {actorName}</span>
                          <span>{date ? date.toLocaleString('pt-BR') : '---'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6">
              {kbView === 'library' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredKnowledge.map((item) => (
                    <KnowledgeCard
                      key={item.id}
                      item={item}
                      onEdit={openAnnotationDialog}
                      onAudit={setAuditArticle}
                      score={kbUseSemantic ? semanticScoreMap.get(item.id) : undefined}
                    />
                  ))}
                </div>
              )}

              {kbView === 'narrative' && (
                <div className="space-y-6">
                  {knowledgeGroups.map((group) => (
                    <div key={group.id} className="rounded-xl border bg-background p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{group.label}</h3>
                          <p className="text-xs text-muted-foreground">{group.description}</p>
                        </div>
                        <Badge variant="secondary">
                          {filteredKnowledge.filter((item) => item.group === group.id).length} itens
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {[...knowledgeGroupsFiltered.entries()]
                          .filter(([key]) => key.startsWith(group.id))
                          .map(([key, items]) => {
                            const [, subgroup] = key.split('__');
                            return (
                              <div key={key} className="rounded-lg border p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold">{subgroup}</span>
                                  <Badge variant="outline">{items.length}</Badge>
                                </div>
                                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                                  {items.slice(0, 3).map((item) => (
                                    <div key={item.id} className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                      <span className="line-clamp-1">{item.title}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {items.slice(0, 2).flatMap((item) => item.highlights.slice(0, 1)).map((hl, idx) => (
                                    <Badge key={`${key}-hl-${idx}`} variant="secondary">
                                      {hl}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {kbView === 'map' && (
                <KnowledgeMapView items={filteredKnowledge} />
              )}
            </div>
          </section>

          <Dialog
            open={isTemplateDialogOpen}
            onOpenChange={(open) => {
              setIsTemplateDialogOpen(open);
              if (!open) resetTemplateWizard();
            }}
          >
            <DialogContent className="max-w-xl" data-testid="wiki-template-dialog">
              <DialogHeader>
                <DialogTitle>Nova página da Wiki</DialogTitle>
                <DialogDescription>
                  Crie em branco ou aplique um template para acelerar documentação e triagem.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template</label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={(value) => {
                      setSelectedTemplateId(value);
                      setTemplateValues({});
                    }}
                  >
                    <SelectTrigger data-testid="wiki-template-select-trigger">
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blank">Página em branco</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeTemplate && (
                  <div className="space-y-3 rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{activeTemplate.description}</p>
                    {activeTemplate.variables.map((variable) => (
                      <div key={variable.key} className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {variable.label}
                          {variable.required ? ' *' : ''}
                        </label>
                        <Input
                          data-testid={`wiki-template-var-${variable.key}`}
                          value={templateValues[variable.key] ?? variable.defaultValue ?? ''}
                          onChange={(event) =>
                            setTemplateValues((previous) => ({
                              ...previous,
                              [variable.key]: event.target.value,
                            }))
                          }
                          placeholder={variable.defaultValue || 'Informe um valor'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)} data-testid="wiki-template-cancel-button">
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  onClick={startBlankPage}
                  data-testid="wiki-template-blank-button"
                >
                  Página em branco
                </Button>
                <Button
                  data-testid="wiki-template-apply-button"
                  onClick={() => {
                    if (!activeTemplate) {
                      startBlankPage();
                      return;
                    }
                    startTemplatePage(activeTemplate);
                  }}
                >
                  Aplicar template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={Boolean(activeArticle)} onOpenChange={(open) => !open && setActiveArticle(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Curadoria de conteudo</DialogTitle>
                <DialogDescription>
                  Atualize destaques, observacoes e status de revisao para a equipe.
                </DialogDescription>
              </DialogHeader>

              {activeArticle && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-semibold">{activeArticle.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeArticle.group} · {activeArticle.subgroup}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Escopo</span>
                      <ToggleGroup
                        type="single"
                        value={annotationScope}
                        onValueChange={(value) => value && setAnnotationScope(value as typeof annotationScope)}
                      >
                        <ToggleGroupItem value="organization">Equipe</ToggleGroupItem>
                        <ToggleGroupItem value="user">Meu</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Select value={annotationStatus} onValueChange={(value) => setAnnotationStatus(value as KnowledgeCurationStatus)}>
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="review">Em revisao</SelectItem>
                          <SelectItem value="verified">Verificado</SelectItem>
                          <SelectItem value="rejected">Rejeitado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Destaques (1 por linha)</label>
                      <Textarea
                        value={annotationHighlights}
                        onChange={(e) => setAnnotationHighlights(e.target.value)}
                        rows={6}
                        placeholder="Ex: Diretriz prioriza exercicios excêntricos..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Observacoes (1 por linha)</label>
                      <Textarea
                        value={annotationObservations}
                        onChange={(e) => setAnnotationObservations(e.target.value)}
                        rows={6}
                        placeholder="Ex: Usar testes funcionais A, B, C..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notas de revisao</label>
                    <Textarea
                      value={annotationNotes}
                      onChange={(e) => setAnnotationNotes(e.target.value)}
                      rows={3}
                      placeholder="Observacoes da curadoria e pendencias."
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveArticle(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveAnnotation}>Salvar curadoria</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={Boolean(auditArticle)} onOpenChange={(open) => !open && setAuditArticle(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Auditoria do artigo</DialogTitle>
                <DialogDescription>
                  Historico de alteracoes para este item.
                </DialogDescription>
              </DialogHeader>

              {auditArticle && (
                <div className="space-y-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-semibold">{auditArticle.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {auditArticle.group} · {auditArticle.subgroup}
                    </p>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground max-h-[320px] overflow-auto pr-2">
                    {knowledgeAudit.filter((entry) => entry.article_id === auditArticle.id).length === 0 && (
                      <p>Nenhuma alteracao registrada ainda.</p>
                    )}
                    {knowledgeAudit
                      .filter((entry) => entry.article_id === auditArticle.id)
                      .map((entry) => {
                        const date = (entry.created_at as { toDate?: () => Date }).toDate?.();
                        const actorName = auditProfiles[entry.actor_id]?.full_name || entry.actor_id;
                        return (
                          <div key={entry.id} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary">{entry.action}</Badge>
                              <span>{date ? date.toLocaleString('pt-BR') : '---'}</span>
                            </div>
                            <div className="mt-2">Responsavel: {actorName}</div>
                            {entry.after && (
                              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-2 text-[11px] text-foreground">
                                {JSON.stringify(entry.after, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setAuditArticle(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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

interface KnowledgeCardProps {
  item: KnowledgeArticle;
  onEdit: (item: KnowledgeArticle) => void;
  onAudit: (item: KnowledgeArticle) => void;
  score?: number;
}

interface TriageColumnProps {
  droppableId: TriageStatus;
  title: string;
  pages: WikiPage[];
  onOpenPage: (page: WikiPage) => void;
  dragEnabled: boolean;
  onMoveStatus: (page: WikiPage, status: TriageStatus) => void;
  wipLimit: number;
}

function TriageColumn({
  droppableId,
  title,
  pages,
  onOpenPage,
  dragEnabled,
  onMoveStatus,
  wipLimit,
}: TriageColumnProps) {
  const isOverLimit = wipLimit < 999 && pages.length > wipLimit;

  return (
    <Card className={isOverLimit ? 'border-amber-400 bg-amber-50/10' : ''}>
      <CardContent className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-semibold ${isOverLimit ? 'text-amber-700' : ''}`}>
              {title}
            </h4>
            {isOverLimit && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            )}
          </div>
          <Badge variant={isOverLimit ? 'destructive' : 'secondary'}>
            {pages.length} {wipLimit < 999 && `/ ${wipLimit}`}
          </Badge>
        </div>
        
        {isOverLimit && (
          <p className="mb-2 text-[10px] text-amber-600 font-medium">
            Limite WIP excedido ({pages.length}/{wipLimit})
          </p>
        )}

        <Droppable droppableId={droppableId} isDropDisabled={!dragEnabled}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              data-testid={`triage-column-${droppableId}`}
              className={`min-h-[140px] space-y-2 rounded-md p-1 transition-colors ${
                snapshot.isDraggingOver ? 'bg-muted/60' : 'bg-muted/20'
              }`}
            >
              {pages.map((page, index) => (
                <Draggable key={page.id} draggableId={page.id} index={index} isDragDisabled={!dragEnabled}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      data-testid={`triage-card-${page.id}`}
                      className={`group relative w-full rounded-md border bg-background p-3 text-left shadow-sm transition ${
                        dragSnapshot.isDragging ? 'ring-2 ring-primary/50' : 'hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button 
                          type="button" 
                          className="flex-1 text-left" 
                          onClick={() => onOpenPage(page)}
                        >
                          <p className="line-clamp-2 text-sm font-medium group-hover:text-primary transition-colors">
                            {page.title}
                          </p>
                        </button>
                        
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onOpenPage(page)}>
                                <Edit className="mr-2 h-3 w-3" />
                                Abrir página
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">Mover para</DropdownMenuLabel>
                              <DropdownMenuItem 
                                disabled={droppableId === 'backlog'}
                                onClick={() => onMoveStatus(page, 'backlog')}
                              >
                                <ArrowLeft className="mr-2 h-3 w-3" />
                                Backlog
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                disabled={droppableId === 'in-progress'}
                                onClick={() => onMoveStatus(page, 'in-progress')}
                              >
                                <Clock className="mr-2 h-3 w-3" />
                                Em execução
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                disabled={droppableId === 'done'}
                                onClick={() => onMoveStatus(page, 'done')}
                              >
                                <ShieldCheck className="mr-2 h-3 w-3" />
                                Concluído
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {page.tags
                            .filter((tag) => !tag.startsWith('triage-'))
                            .slice(0, 2)
                            .map((tag) => (
                              <Badge key={`${page.id}-${tag}`} variant="secondary" className="text-[10px] py-0 h-4">
                                {tag}
                              </Badge>
                            ))}
                        </div>
                        <span className="text-[9px] text-muted-foreground opacity-60">
                          {page.template_id?.split('-')[0] || 'manual'}
                        </span>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
}

function KnowledgeCard({ item, onEdit, onAudit, score }: KnowledgeCardProps) {
  const statusLabel: Record<string, string> = {
    verified: 'Verificado',
    pending: 'Pendente',
    review: 'Em revisao',
    rejected: 'Rejeitado',
  };
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-semibold leading-tight">{item.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {item.group} · {item.subgroup}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={item.status === 'verified' ? 'default' : 'outline'}>
              {statusLabel[item.status] || 'Pendente'}
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => onAudit(item)} className="h-7 w-7">
              <History className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-7 w-7">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{knowledgeEvidenceLabels[item.evidence]}</Badge>
          {typeof score === 'number' && (
            <Badge variant="outline">Score {score.toFixed(2)}</Badge>
          )}
          {item.year && <Badge variant="outline">{item.year}</Badge>}
          {item.source && (
            <Badge variant="outline" className="text-xs">
              {item.source}
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Destaques</p>
          <div className="flex flex-wrap gap-2">
            {(item.highlights.length ? item.highlights : ['Sem destaques ainda.']).map((hl, idx) => (
              <Badge key={`${item.id}-hl-${idx}`} variant="secondary">
                {hl}
              </Badge>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Observacoes</p>
          <div className="space-y-1">
            {(item.observations.length ? item.observations : ['Sem observacoes registradas.']).map((obs, idx) => (
              <div key={`${item.id}-obs-${idx}`} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                <span>{obs}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.tags.slice(0, 3).map((tag) => (
            <Badge key={`${item.id}-tag-${tag}`} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {item.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{item.tags.length - 3}
            </Badge>
          )}
        </div>

        {item.url && (
          <Button asChild variant="ghost" size="sm" className="px-0 text-primary">
            <a href={item.url} target="_blank" rel="noreferrer">
              Abrir fonte
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface KnowledgeMapViewProps {
  items: KnowledgeArticle[];
}

function KnowledgeMapView({ items }: KnowledgeMapViewProps) {
  const groups = knowledgeGroups.map((group, groupIndex) => {
    const subgroups = Array.from(
      new Set(items.filter((item) => item.group === group.id).map((item) => item.subgroup))
    );
    return {
      group,
      subgroups,
      x: (groupIndex + 1) / (knowledgeGroups.length + 1),
    };
  });

  const nodes = groups.flatMap((group) =>
    group.subgroups.map((subgroup, index) => ({
      group: group.group,
      subgroup,
      x: group.x,
      y: (index + 1) / (group.subgroups.length + 1),
      count: items.filter((item) => item.group === group.group.id && item.subgroup === subgroup).length,
    }))
  );

  return (
    <div className="relative rounded-2xl border bg-background p-6 min-h-[520px] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top,#0f172a_0%,transparent_55%)]" />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {nodes.map((node) => (
          <line
            key={`${node.group.id}-${node.subgroup}`}
            x1={node.x * 100}
            y1={10}
            x2={node.x * 100}
            y2={node.y * 100}
            stroke="rgba(148,163,184,0.25)"
            strokeWidth="0.3"
          />
        ))}
      </svg>

      <div className="relative z-10 flex justify-between text-xs text-muted-foreground">
        {groups.map((group) => (
          <div key={group.group.id} className="text-center w-full">
            <div className={`mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1 ${group.group.soft}`}>
              <span className={`font-semibold ${group.group.accent}`}>{group.group.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-6">
        {nodes.map((node) => (
          <div
            key={`${node.group.id}-${node.subgroup}-node`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background/90 shadow-sm px-3 py-2 text-xs"
            style={{ left: `${node.x * 100}%`, top: `${node.y * 100}%` }}
          >
            <div className="font-semibold">{node.subgroup}</div>
            <div className="text-muted-foreground">{node.count} itens</div>
          </div>
        ))}
      </div>
    </div>
  );
}
