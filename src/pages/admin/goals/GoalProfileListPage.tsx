import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { 
    Plus, 
    Edit, 
    Send, 
    Loader2, 
    Search, 
    Filter, 
    Target, 
    Info, 
    ArrowRight,
    ClipboardList,
    Activity,
    Stethoscope,
    ShieldCheck
} from 'lucide-react';
import { goalsAdminService } from '@/services/goals/goalsAdminService';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/ui/empty-state';
import { GOAL_PROFILES_SEED } from '@/lib/goals/goalProfiles.seed';

export default function GoalProfileListPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newProfile, setNewProfile] = useState({ id: '', name: '', description: '' });

    const [showGuide, setShowGuide] = useState(false);

    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Query for listing profiles
    const { data: profiles = [], isLoading, error } = useQuery({
        queryKey: ['goalProfiles'],
        queryFn: goalsAdminService.listProfiles,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // ... (rest of mutations)
    
    // Mutation for creating profile
    const createProfileMutation = useMutation({
        mutationFn: (data: { id: string; name: string; description: string }) =>
            goalsAdminService.createProfile(data.id, data.name, data.description),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['goalProfiles'] });
            toast({
                title: "Perfil criado",
                description: "O perfil de meta foi criado como rascunho.",
            });
            setIsCreateDialogOpen(false);
            setNewProfile({ id: '', name: '', description: '' });
            navigate(`/admin/goals/${data.id}`);
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao criar perfil",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    // Mutation for publishing profile
    const publishProfileMutation = useMutation({
        mutationFn: (id: string) => goalsAdminService.publishProfile(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goalProfiles'] });
            toast({
                title: "Perfil publicado",
                description: "O perfil agora está disponível para uso clínico.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao publicar",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const handleCreateProfile = () => {
        if (!newProfile.id || !newProfile.name) {
            toast({
                title: "Campos obrigatórios",
                description: "ID e Nome são obrigatórios.",
                variant: "destructive",
            });
            return;
        }
        createProfileMutation.mutate(newProfile);
    };

    const handlePublish = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        publishProfileMutation.mutate(id);
    };

    const filteredProfiles = profiles.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PUBLISHED':
                return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Publicado</Badge>;
            case 'DRAFT':
                return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Rascunho</Badge>;
            case 'ARCHIVED':
                return <Badge variant="outline" className="text-muted-foreground bg-gray-50">Arquivado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const handleQuickCreate = (seed: typeof GOAL_PROFILES_SEED[0]) => {
        createProfileMutation.mutate({
            id: seed.id,
            name: seed.name,
            description: seed.description
        });
    };

    return (
        <MainLayout>
            <div className="container mx-auto p-6 space-y-8 bg-[#f8faff] min-h-screen">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" />
                            Governança Clínica
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Gestão de Metas</h1>
                        <p className="text-lg text-slate-500 max-w-2xl">
                            Crie e gerencie templates de metas baseados em evidência científica (SMART) para elevar o padrão da sua análise clínica.
                        </p>
                    </div>
                    
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2 h-12 px-6 rounded-xl transition-all hover:scale-[1.02]">
                                <Plus className="h-5 w-5" />
                                Novo Template Customizado
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl">Criar Novo Template de Metas</DialogTitle>
                                <DialogDescription className="text-base">
                                    Templates permitem padronizar o acompanhamento de metas SMART para seus pacientes.
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="id" className="font-semibold">ID Único</Label>
                                        <Input
                                            id="id"
                                            value={newProfile.id}
                                            onChange={(e) => setNewProfile({ ...newProfile, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                            placeholder="ex: acl_rts_avancado"
                                            className="h-11 rounded-lg"
                                        />
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Identificador técnico sem espaços</p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="name" className="font-semibold">Nome do Template</Label>
                                        <Input
                                            id="name"
                                            value={newProfile.name}
                                            onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                                            placeholder="Ex: LCA — Prontidão para Esporte"
                                            className="h-11 rounded-lg"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description" className="font-semibold">Descrição Curta</Label>
                                        <Input
                                            id="description"
                                            value={newProfile.description}
                                            onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                                            placeholder="Para que serve este template..."
                                            className="h-11 rounded-lg"
                                        />
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Target className="w-4 h-4 text-blue-500" />
                                        Metodologia SMART
                                    </h4>
                                    <ul className="text-xs space-y-3 text-slate-600">
                                        <li className="flex gap-2">
                                            <span className="font-bold text-blue-600 min-w-[15px]">S</span>
                                            <span><strong>Específica:</strong> O que exatamente será alcançado?</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="font-bold text-blue-600 min-w-[15px]">M</span>
                                            <span><strong>Mensurável:</strong> Como mediremos o sucesso (métrica)?</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="font-bold text-blue-600 min-w-[15px]">A</span>
                                            <span><strong>Alcançável:</strong> A meta é realista para o paciente?</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="font-bold text-blue-600 min-w-[15px]">R</span>
                                            <span><strong>Relevante:</strong> Faz sentido para a patologia?</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="font-bold text-blue-600 min-w-[15px]">T</span>
                                            <span><strong>Temporal:</strong> Qual o prazo esperado?</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            
                            <DialogFooter className="gap-2">
                                <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="rounded-lg">Cancelar</Button>
                                <Button 
                                    onClick={handleCreateProfile} 
                                    disabled={createProfileMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700 rounded-lg h-11 px-8"
                                >
                                    {createProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Criar e Configurar
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Quick Templates Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-blue-500" />
                        Sugestões de Templates Rápidos
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {GOAL_PROFILES_SEED.slice(0, 4).map((seed) => (
                            <Card key={seed.id} className="group hover:border-blue-300 transition-all cursor-pointer border-dashed bg-white/50" onClick={() => handleQuickCreate(seed)}>
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                                            <Activity className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                    <CardTitle className="text-sm font-bold group-hover:text-blue-700 transition-colors">{seed.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <p className="text-xs text-slate-500 line-clamp-2">{seed.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Main List Section */}
                <div className="space-y-4 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-500" />
                            Seus Templates
                        </h2>
                        
                        <div className="flex items-center gap-2">
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Pesquisar templates..."
                                    className="pl-10 h-10 border-slate-200 bg-white rounded-xl focus-visible:ring-blue-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px] h-10 border-slate-200 bg-white rounded-xl">
                                    <Filter className="mr-2 h-4 w-4 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="PUBLISHED">Publicados</SelectItem>
                                    <SelectItem value="DRAFT">Rascunhos</SelectItem>
                                    <SelectItem value="ARCHIVED">Arquivados</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="h-48 animate-pulse bg-slate-100 border-none" />
                            ))}
                        </div>
                    ) : filteredProfiles.length === 0 ? (
                        <EmptyState
                            icon={Target}
                            title="Nenhum template encontrado"
                            description="Você ainda não criou nenhum template customizado de metas para sua clínica."
                            action={{
                                label: "Criar Primeiro Template",
                                onClick: () => setIsCreateDialogOpen(true)
                            }}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProfiles.map((p) => (
                                <Card 
                                    key={p.id} 
                                    className="group hover:shadow-xl hover:shadow-blue-900/5 transition-all border-slate-200 overflow-hidden flex flex-col bg-white"
                                >
                                    <CardHeader className="space-y-1 pb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            {getStatusBadge(p.status)}
                                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{p.id}</span>
                                        </div>
                                        <CardTitle className="text-xl font-bold group-hover:text-blue-600 transition-colors leading-tight">
                                            {p.name}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2 text-slate-500 pt-1">
                                            {p.description || "Sem descrição disponível."}
                                        </CardDescription>
                                    </CardHeader>
                                    
                                    <CardContent className="flex-grow pt-0 pb-6">
                                        <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-50 pt-4">
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className="text-[10px] font-bold border-slate-100 bg-slate-50/50">v{p.version}</Badge>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Activity className="w-3 h-3" />
                                                <span>{format(new Date(p.updated_at), 'dd MMM yy')}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    
                                    <CardFooter className="bg-slate-50/50 p-4 flex gap-2 border-t border-slate-100">
                                        <Button 
                                            variant="secondary" 
                                            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 gap-2 h-10 rounded-lg"
                                            onClick={() => navigate(`/admin/goals/${p.id}`)}
                                        >
                                            <Edit className="w-4 h-4" />
                                            Editar
                                        </Button>
                                        {p.status === 'DRAFT' && (
                                            <Button 
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10 rounded-lg"
                                                onClick={(e) => handlePublish(p.id, e)}
                                                disabled={publishProfileMutation.isPending}
                                            >
                                                {publishProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                Publicar
                                            </Button>
                                        )}
                                        {p.status === 'PUBLISHED' && (
                                            <Button 
                                                variant="ghost" 
                                                className="w-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 gap-2 h-10 rounded-lg"
                                                onClick={() => navigate(`/admin/goals/${p.id}`)}
                                            >
                                                Ver Detalhes
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="bg-blue-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200 mt-12">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-4 max-w-xl">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <Info className="w-6 h-6" />
                                O Poder das Metas SMART
                            </h3>
                            <p className="text-blue-100 opacity-90 leading-relaxed">
                                Pacientes com metas bem definidas apresentam 40% mais engajamento no tratamento. Use nossos templates para garantir que cada plano de evolução seja específico, mensurável e baseado em evidência.
                            </p>
                            <Button 
                                variant="outline" 
                                className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600 rounded-xl h-11 px-6 transition-all"
                                onClick={() => setShowGuide(!showGuide)}
                            >
                                {showGuide ? 'Ocultar Guia' : 'Ler Guia de Melhores Práticas'}
                            </Button>
                        </div>
                        <div className="hidden lg:block p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                            <Stethoscope className="w-24 h-24 text-blue-100 opacity-20 absolute -right-4 -bottom-4" />
                            <div className="space-y-4 relative z-20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center">
                                        <Badge className="bg-emerald-400 text-slate-900 border-none">95%</Badge>
                                    </div>
                                    <p className="text-sm font-medium">Precisão Clínica</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
                                        <Badge className="bg-amber-400 text-slate-900 border-none">{profiles.filter(p => p.status === 'PUBLISHED').length}</Badge>
                                    </div>
                                    <p className="text-sm font-medium">Templates Ativos</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Background Pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                {/* Guide Section (Collapsible) */}
                {showGuide && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <Card className="border-none shadow-xl bg-white overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                                    Guia de Melhores Práticas: Metas SMART em Fisioterapia
                                </CardTitle>
                                <CardDescription className="text-base">
                                    Aprenda a estruturar objetivos clínicos que transformam a adesão do paciente.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-200">S</div>
                                        <h4 className="font-bold text-slate-800">Específica</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Evite "melhorar força". Use: "Aumentar flexão ativa de joelho para 120° visando independência em subir escadas".
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-200">M</div>
                                        <h4 className="font-bold text-slate-800">Mensurável</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Utilize métricas objetivas como ADM, Força (kg), Escalas (EVA/PROM) ou indicadores de vídeo (valgo em graus).
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-400 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-100">A</div>
                                        <h4 className="font-bold text-slate-800">Alcançável</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            A meta deve desafiar o paciente mas ser realisticamente possível dentro do quadro clínico e biologia tecidual.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-300 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-50">R</div>
                                        <h4 className="font-bold text-slate-800">Relevante</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            A meta deve importar para o paciente. Deve estar conectada ao desejo de retorno funcional ou esportivo.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-slate-200">T</div>
                                        <h4 className="font-bold text-slate-800">Temporal</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Toda meta precisa de um prazo. "Em 4 semanas", "Até a 12ª sessão". Isso cria senso de urgência e foco.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-12 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-white rounded-xl shadow-sm">
                                            <Target className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-emerald-900 text-lg">Dica de Especialista</h4>
                                            <p className="text-emerald-800 text-sm opacity-90 leading-relaxed">
                                                Combine **PROMs** (Percepção do Paciente) com **Biometria de Vídeo** (Análise Objetiva). Quando o paciente vê a evolução nos números e na tela, a retenção e o valor percebido do seu tratamento aumentam drasticamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

