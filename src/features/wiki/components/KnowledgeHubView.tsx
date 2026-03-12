import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Target,
  ShieldCheck,
  LayoutGrid,
  AlignLeft,
  Share2,
  Search,
  History,
  Pencil,
} from 'lucide-react';
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
  score?: number;
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
            <div className={`mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1 ${group.Soft}`}>
              <span className={`font-semibold ${group.Accent}`}>{group.group.label}</span>
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
  onEditArticle: (article: KnowledgeArticle) => void;
  onAuditArticle: (article: KnowledgeArticle) => void;
  articleTitleMap: Map<string, string>;
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
  onSync,
  onIndex,
  onEditArticle,
  onAuditArticle,
  articleTitleMap,
}: KnowledgeHubViewProps) {
  return (
    <section className="mb-10">
      {/* Banner */}
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
                  <span className="text-white font-semibold">
                    {filteredKnowledge.filter(item => item.group === group.id).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {/* Filters Card */}
          <div className="rounded-xl border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Mapa rapido de curadoria</h3>
                <p className="text-xs text-muted-foreground">Selecione o grupo e o modo de leitura.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={onSync} disabled={syncing}>
                  {syncing ? 'Sincronizando...' : 'Sincronizar base'}
                </Button>
                <Button variant="default" size="sm" onClick={onIndex} disabled={indexing}>
                  {indexing ? 'Indexando...' : 'Indexar semantica'}
                </Button>
              </div>
              <ToggleGroup
                type="single"
                value={kbFilters.view}
                onValueChange={(value) => value && setKbFilters.setView(value)}
                className="flex flex-wrap gap-2"
              >
                <ToggleGroupItem value="library">
                  <LayoutGrid className="h-4 w-4 mr-2" /> Biblioteca
                </ToggleGroupItem>
                <ToggleGroupItem value="narrative">
                  <AlignLeft className="h-4 w-4 mr-2" /> Narrativa
                </ToggleGroupItem>
                <ToggleGroupItem value="map">
                  <Share2 className="h-4 w-4 mr-2" /> Mapa
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.6fr]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar diretrizes, subgrupos, tags..."
                  value={kbFilters.query}
                  onChange={(e) => setKbFilters.setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={kbFilters.useSemantic} onCheckedChange={setKbFilters.setUseSemantic} />
                  Busca semantica
                </div>
                <ToggleGroup
                  type="single"
                  value={kbFilters.status}
                  onValueChange={(value) => value && setKbFilters.setStatus(value)}
                  className="flex gap-2"
                >
                  <ToggleGroupItem value="verified">Verificados</ToggleGroupItem>
                  <ToggleGroupItem value="pending">Pendentes</ToggleGroupItem>
                  <ToggleGroupItem value="all">Todos</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>

          {/* Tabs Card */}
          <div className="rounded-xl border bg-background p-4">
            <Tabs value={kbFilters.group} onValueChange={(value) => setKbFilters.setGroup(value)}>
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
                    variant={kbFilters.evidence === tier ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setKbFilters.setEvidence(kbFilters.evidence === tier ? 'Todas' : tier)}
                  >
                    {knowledgeEvidenceLabels[tier]}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Audit Card */}
        <div className="rounded-xl border bg-background p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Auditoria recente</h3>
            <Badge variant="outline">{auditItems.length}</Badge>
          </div>
          <div className="space-y-3 text-xs text-muted-foreground">
            {auditItems.length === 0 && <p>Nenhuma atividade registrada ainda.</p>}
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

      {/* Results View */}
      <div className="mt-6">
        {kbFilters.view === 'library' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredKnowledge.map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onEdit={onEditArticle}
                onAudit={onAuditArticle}
                score={kbFilters.useSemantic ? semanticScoreMap.get(item.id) : undefined}
              />
            ))}
          </div>
        )}

        {kbFilters.view === 'narrative' && (
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
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}

        {kbFilters.view === 'map' && <KnowledgeMapView items={filteredKnowledge} />}
      </div>
    </section>
  );
}
