import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Target,
  ShieldCheck,
  LayoutGrid,
  Share2,
  Search,
  History,
  Pencil,
  Trash2,
  Plus,
  Copy,
  Lightbulb,
  Filter,
  TrendingUp,
  UserCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  knowledgeGroups,
  knowledgeEvidenceLabels,
  type KnowledgeArticle,
  type EvidenceTier,
} from '@/data/knowledgeBase';

interface KnowledgeCardProps {
  item: KnowledgeArticle;
  onEdit: (item: KnowledgeArticle) => void;
  onAudit: (item: KnowledgeArticle) => void;
  onDelete?: (item: KnowledgeArticle) => void;
  curationMap?: Map<string, any>;
  auditProfiles?: any;
  score?: number;
}

const evidenceColorMap: Record<EvidenceTier, string> = {
  CPG: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  Consensus: 'bg-blue-500/10 text-blue-700 border-blue-200',
  Guideline: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
  SystematicReview: 'bg-purple-500/10 text-purple-700 border-purple-200',
  PositionStatement: 'bg-amber-500/10 text-amber-700 border-amber-200',
  Protocol: 'bg-slate-500/10 text-slate-700 border-slate-200',
};

function KnowledgeCard({ item, onEdit, onAudit, onDelete, curationMap, auditProfiles, score }: KnowledgeCardProps) {
  const statusLabel: Record<string, string> = {
    verified: 'Verificado',
    pending: 'Pendente',
    review: 'Em revisão',
    rejected: 'Rejeitado',
  };

  const curation = curationMap?.get(item.id);
  const reviewerName = curation?.assigned_to ? auditProfiles?.[curation.assigned_to]?.full_name : null;

  const handleCopySummary = () => {
    const text = `*${item.title}*\n${item.group} - ${item.subgroup}\n\nDestaques:\n${item.highlights.map(h => `- ${h}`).join('\n')}\n\nLink: ${item.url || 'N/A'}`;
    navigator.clipboard.writeText(text);
    toast.success('Resumo copiado para a área de transferência!');
  };

  return (
    <Card className="hover:shadow-md transition-all flex flex-col h-full border-slate-200/60 overflow-hidden group">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Header with Background Accent */}
        <div className={`h-1.5 w-full ${item.status === 'verified' ? 'bg-emerald-500' : item.status === 'review' ? 'bg-amber-500' : 'bg-slate-300'}`} />
        
        <div className="p-4 flex flex-col h-full space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h4 className="font-semibold leading-tight line-clamp-2 text-slate-900 dark:text-slate-100" title={item.title}>
                {item.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  {item.group}
                </span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {item.subgroup}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={handleCopySummary} className="h-7 w-7" title="Copiar Resumo">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-7 w-7" title="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {onDelete && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onDelete(item)} 
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`${evidenceColorMap[item.evidence] || ''} border-0 font-bold text-[10px]`}>
              {knowledgeEvidenceLabels[item.evidence] || item.evidence}
            </Badge>
            {item.status === 'review' && reviewerName && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-0 text-[10px] flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                Validando: {reviewerName.split(' ')[0]}
              </Badge>
            )}
            {item.status === 'pending' && (
              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                IA Pendente
              </Badge>
            )}
            {item.year && <span className="text-[10px] text-muted-foreground font-medium">{item.year}</span>}
          </div>

          {item.keyQuestions && item.keyQuestions.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Lightbulb className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Clinician Q&A:</span>
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                "{item.keyQuestions[0]}"
              </p>
            </div>
          )}

          <div className="flex-1 space-y-3 pt-1">
            <div className="text-xs">
              <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Key Findings</p>
              <div className="space-y-1.5">
                {(item.highlights && item.highlights.length ? item.highlights.slice(0, 2) : ['Aguardando curadoria...']).map((hl, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-400 leading-snug">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                    <span className="line-clamp-2">{hl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {item.tags && item.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[10px] text-muted-foreground font-medium bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded">#{tag}</span>
              ))}
            </div>

            {item.url && (
              <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs font-bold text-primary">
                <a href={item.url} target="_blank" rel="noreferrer">
                  Ver Fonte
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KnowledgeMapView({ items }: { items: KnowledgeArticle[] }) {
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
    <div className="relative rounded-2xl border bg-background p-6 min-h-[600px] overflow-hidden">
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
            <div className={`mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1 ${group.soft}`}>
              <span className={`font-semibold ${group.accent}`}>{group.group.label}</span>
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

interface KnowledgeHubViewProps {
  knowledgeStats: { total: number; verified: number };
  knowledgeGroupsFiltered: Map<string, KnowledgeArticle[]>;
  filteredKnowledge: KnowledgeArticle[];
  auditItems: any[];
  auditProfiles: any;
  semanticScoreMap: Map<string, number>;
  kbFilters: any;
  setKbFilters: any;
  syncing: boolean;
  indexing: boolean;
  onSync: () => void;
  onIndex: () => void;
  onCreateArticle: () => void;
  onEditArticle: (article: KnowledgeArticle) => void;
  onDeleteArticle: (article: KnowledgeArticle) => void;
  onAuditArticle: (article: KnowledgeArticle | null) => void;
  articleTitleMap: Map<string, string>;
  curationMap: Map<string, any>;
}

export function KnowledgeHubView({
  knowledgeStats,
  knowledgeGroupsFiltered,
  filteredKnowledge,
  auditItems,
  auditProfiles,
  semanticScoreMap,
  kbFilters,
  setKbFilters,
  syncing,
  indexing,
  onCreateArticle,
  onEditArticle,
  onDeleteArticle,
  onAuditArticle,
  articleTitleMap,
  curationMap,
}: KnowledgeHubViewProps) {
  const trendingArticles = filteredKnowledge.slice(0, 3);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar de Filtros (Left) */}
      <aside className="lg:w-72 shrink-0 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Filtros Avançados</h3>
          </div>
          
          <div className="rounded-xl border bg-card p-4 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Especialidade</Label>
              <Select value={kbFilters.group} onValueChange={(v) => setKbFilters.setGroup(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas</SelectItem>
                  {knowledgeGroups.map(g => <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Nível de Evidência</Label>
              <div className="grid grid-cols-1 gap-1">
                <Button 
                  variant={kbFilters.evidence === 'Todas' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="justify-start h-8 text-xs font-medium"
                  onClick={() => setKbFilters.setEvidence('Todas')}
                >
                  Todas as fontes
                </Button>
                {(['CPG', 'Consensus', 'Guideline', 'SystematicReview'] as EvidenceTier[]).map(tier => (
                  <Button 
                    key={tier}
                    variant={kbFilters.evidence === tier ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="justify-start h-8 text-xs font-medium"
                    onClick={() => setKbFilters.setEvidence(tier)}
                  >
                    {knowledgeEvidenceLabels[tier]}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Status de Curadoria</Label>
              <ToggleGroup
                type="single"
                value={kbFilters.status}
                onValueChange={(v) => v && setKbFilters.setStatus(v)}
                className="flex flex-col gap-1 w-full"
              >
                <ToggleGroupItem value="all" className="justify-start px-3 h-8 text-xs w-full">Todos</ToggleGroupItem>
                <ToggleGroupItem value="verified" className="justify-start px-3 h-8 text-xs w-full">Verificados</ToggleGroupItem>
                <ToggleGroupItem value="pending" className="justify-start px-3 h-8 text-xs w-full">Pendentes</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="rounded-xl bg-slate-900 text-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h4 className="text-sm font-bold">Base Certificada</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-xs text-slate-400">Total de Itens</span>
              <span className="text-lg font-bold leading-none">{knowledgeStats.total}</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-1000" 
                style={{ width: `${(knowledgeStats.verified / (knowledgeStats.total || 1)) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              A meta da clínica é manter 90% da base em status "Verificado".
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content (Center) */}
      <main className="flex-1 space-y-6 min-w-0">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background sticky top-0 z-20 pb-2">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar diretrizes clinicas..."
              value={kbFilters.query}
              onChange={(e) => setKbFilters.setQuery(e.target.value)}
              className="pl-10 h-11 bg-muted/50 border-transparent focus:border-primary transition-all rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-transparent">
               <Switch checked={kbFilters.useSemantic} onCheckedChange={setKbFilters.setUseSemantic} size="sm" />
               <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">IA Semantic</span>
            </div>
            <ToggleGroup
              type="single"
              value={kbFilters.view}
              onValueChange={(v) => v && setKbFilters.setView(v)}
              className="bg-muted/50 p-1 rounded-lg"
            >
              <ToggleGroupItem value="library" className="h-8 w-8 p-0" title="Grade"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="map" className="h-8 w-8 p-0" title="Mapa de Conhecimento"><Share2 className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
            <Button variant="default" size="sm" onClick={onCreateArticle} className="h-9 px-4 rounded-lg font-bold shadow-sm shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" /> Novo
            </Button>
          </div>
        </header>

        {kbFilters.view === 'library' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredKnowledge.map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onEdit={onEditArticle}
                onAudit={onAuditArticle}
                onDelete={onDeleteArticle}
                curationMap={curationMap}
                auditProfiles={auditProfiles}
                score={kbFilters.useSemantic ? semanticScoreMap.get(item.id) : undefined}
              />
            ))}
          </div>
        )}

        {kbFilters.view === 'map' && <KnowledgeMapView items={filteredKnowledge} />}

        {filteredKnowledge.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
              <Search className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum artigo localizado</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
              Tente ajustar seus filtros ou termos de pesquisa para localizar a diretriz desejada.
            </p>
          </div>
        )}
      </main>

      {/* Activity & Trends (Right Sidebar) */}
      <aside className="lg:w-80 shrink-0 space-y-6">
        {/* Trending Widget */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Em Destaque</h3>
          </div>
          <div className="space-y-4">
            {trendingArticles.map((article, idx) => (
              <div key={article.id} className="flex gap-3 group cursor-pointer" onClick={() => onEditArticle(article)}>
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  0{idx + 1}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold truncate leading-none mb-1 group-hover:text-primary transition-colors">{article.title}</h4>
                  <span className="text-[10px] text-muted-foreground">{article.subgroup}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline de Auditoria */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Atividade Recente</h3>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase" onClick={() => onAuditArticle(null)}>Ver tudo</Button>
          </div>

          <ScrollArea className="h-[450px] pr-4">
            <div className="space-y-6 relative ml-2 border-l border-slate-100 dark:border-slate-800 pl-4">
              {auditItems && auditItems.length === 0 && <p className="text-[10px] text-muted-foreground italic">Nenhuma atividade registrada.</p>}
              {auditItems && auditItems.slice(0, 10).map((entry) => {
                const title = articleTitleMap.get(entry.article_id) || entry.article_id;
                const date = (entry.created_at as any).toDate?.() || new Date(entry.created_at);
                const actorName = auditProfiles && auditProfiles[entry.actor_id]?.full_name || 'Sistema';
                return (
                  <div key={entry.id} className="relative group">
                    <div className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-slate-200 border-2 border-white group-hover:bg-primary transition-colors" />
                    <div className="space-y-1">
                      <p className="text-[11px] leading-tight font-medium">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{actorName}</span> 
                        <span className="text-muted-foreground mx-1">realizou</span> 
                        <span className="text-primary font-bold">{entry.action}</span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 line-clamp-1 italic">"{title}"</p>
                      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                        <Calendar className="h-2.5 w-2.5" />
                        {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </aside>
    </div>
  );
}
