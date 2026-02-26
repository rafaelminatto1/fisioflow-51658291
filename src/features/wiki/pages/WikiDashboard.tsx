import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  Activity, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Filter,
  Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '@/features/wiki/services/knowledgeService';
import { useAuth } from '@/contexts/AuthContext';
import { StudyMode } from '../components/StudyMode';
import { ArticleUploadDialog } from '../components/dialogs/ArticleUploadDialog';
import type { KnowledgeArtifact } from '@/features/wiki/types/knowledge';
import { seedKnowledgeBase } from '@/features/wiki/utils/seedData';
import { toast } from 'sonner';

export default function WikiDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState<KnowledgeArtifact | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: ['knowledge-artifacts', user?.organizationId],
    queryFn: () => user?.organizationId ? knowledgeService.listArtifacts(user.organizationId) : Promise.resolve([]),
    enabled: !!user?.organizationId
  });

  const filteredArtifacts = artifacts.filter(art => 
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.subgroup.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenStudy = (artifact: KnowledgeArtifact) => {
    setSelectedArtifact(artifact);
  };

  if (selectedArtifact) {
    return <StudyMode artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} />;
  }

  const handleSeed = async () => {
    if (!user?.organizationId) {
      // toast.error('Erro: Usuário sem Organização definida.');
      return;
    }
    toast.promise(async () => {
      const count = await seedKnowledgeBase(user.organizationId);
      await queryClient.invalidateQueries({ queryKey: ['knowledge-artifacts'] });
      return count;
    }, {
      loading: 'Populando base de conhecimento...',
      success: (count) => `Sucesso! ${count} artigos adicionados.`,
      error: 'Erro ao popular base.'
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-12 shadow-2xl">
        {/* ... existing hero content ... */}
        
        {/* Dev Tool: Hidden Seed Button (visible on hover of bottom right corner or similar, but for now just a small discreet button) */}
        <div className="absolute top-4 right-4">
            <Button variant="ghost" size="sm" className="text-white/20 hover:text-white hover:bg-white/10" onClick={handleSeed}>
                Seed DB
            </Button>
        </div>

        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] opacity-10 bg-cover bg-center mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-900/40" />
        
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <Sparkles className="h-3 w-3" />
            FisioFlow Intelligence Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Excelência clínica <br/>
            <span className="text-emerald-400">baseada em evidências.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Acesse protocolos verificados, consensos internacionais e diretrizes atualizadas. 
            Use nossa IA para extrair respostas de documentos complexos em segundos.
          </p>
          
          <div className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Busque por 'LCA', 'Ombro', 'Protocolo'..." 
              className="pl-12 h-14 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-slate-400 focus:bg-white/20 backdrop-blur-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Stats / Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Artigos Verificados</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{artifacts.filter(a => a.status === 'verified').length}</div>
            <p className="text-xs text-muted-foreground mt-1">Nível ouro de evidência</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Estudo</CardTitle>
            <Activity className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">3</div>
            <p className="text-xs text-muted-foreground mt-1">Documentos abertos recentemente</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Novos Insights</CardTitle>
            <Sparkles className="h-4 w-4 text-violet-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">12</div>
            <p className="text-xs text-muted-foreground mt-1">Resumos gerados por IA</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-white border">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="favorites">Favoritos</TabsTrigger>
            <TabsTrigger value="recent">Recentes</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" className="hidden sm:flex">
               <Filter className="h-4 w-4 mr-2" />
               Filtrar
             </Button>
             <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setIsUploadOpen(true)}>
               <Plus className="h-4 w-4 mr-2" />
               Adicionar Artigo
             </Button>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
               [1,2,3].map(i => (
                 <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />
               ))
            ) : filteredArtifacts.length > 0 ? (
              filteredArtifacts.map((artifact) => (
                <ArtifactCard 
                  key={artifact.id} 
                  artifact={artifact} 
                  onClick={() => handleOpenStudy(artifact)} 
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-slate-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum documento encontrado para "{searchQuery}"</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ArticleUploadDialog 
        open={isUploadOpen} 
        onOpenChange={setIsUploadOpen} 
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['knowledge-artifacts'] })}
      />
    </div>
  );
}

function ArtifactCard({ artifact, onClick }: { artifact: KnowledgeArtifact, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col justify-between rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <Badge variant={artifact.status === 'verified' ? 'default' : 'secondary'} className={artifact.status === 'verified' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
            {artifact.subgroup}
          </Badge>
          {artifact.evidenceLevel === 'Consensus' && (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Gold</Badge>
          )}
        </div>
        
        <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {artifact.title}
        </h3>
        
        <div className="text-xs text-slate-500 line-clamp-2">
          {artifact.summary || "Sem resumo disponível. Clique para gerar com IA."}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{artifact.metadata.year}</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
          Estudar <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  )
}
