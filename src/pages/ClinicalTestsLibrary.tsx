import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    HeartPulse,
    Search,
    PlayCircle,
    Info,
    ThumbsUp,
    X,
    CheckSquare,
    FileText,
    Image as ImageIcon,
    ArrowRight,
    Plus,
    Edit3,
    Trash2,
    Download,
    CalendarCheck,
} from 'lucide-react';
import { ClinicalTestFormModal } from '@/components/clinical/ClinicalTestFormModal';
import { useExerciseProtocols } from '@/hooks/useExerciseProtocols';
import { generateClinicalTestPdf } from '@/utils/generateClinicalTestPdf';

const MediaPlaceholder = ({ label }: { label: string }) => (
    <div className="aspect-square rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-4 transition-colors hover:bg-slate-100 hover:border-slate-300">
        <ImageIcon className="h-6 w-6 text-slate-300 mb-2" />
        <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
);

interface ClinicalTest {
    id: string;
    name: string;
    name_en?: string;
    category: string;
    target_joint: string;
    purpose: string;
    execution: string;
    positive_sign?: string;
    reference?: string;
    sensitivity_specificity?: string;
    tags?: string[];
    media_urls?: string[];
    description?: string;
    fields_definition?: unknown[];
    regularity_sessions?: number | null;
    organization_id?: string | null;
}

export default function ClinicalTestsLibrary() {
    const queryClient = useQueryClient();
    const [activeFilter, setActiveFilter] = useState("Todos");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTest, setSelectedTest] = useState<ClinicalTest | null>(null);
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [testToEdit, setTestToEdit] = useState<ClinicalTest | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState<ClinicalTest | null>(null);

    // Protocol integration state
    const [protocolDialogOpen, setProtocolDialogOpen] = useState(false);
    const { protocols, updateProtocol } = useExerciseProtocols();

    const { data: tests = [], isLoading } = useQuery({
        queryKey: ['clinical-tests-library'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clinical_test_templates')
                .select('*')
                .order('name');

            if (error) throw error;
            return data as ClinicalTest[];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (testId: string) => {
            const { error } = await supabase
                .from('clinical_test_templates')
                .delete()
                .eq('id', testId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Teste excluído com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['clinical-tests-library'] });
            setDeleteDialogOpen(false);
            setTestToDelete(null);
            setSelectedTest(null);
        },
        onError: () => {
            toast.error('Erro ao excluir teste');
        },
    });

    const handleCreateNew = () => {
        setTestToEdit(null);
        setFormMode('create');
        setFormModalOpen(true);
    };

    const handleEdit = (test: ClinicalTest) => {
        setTestToEdit(test);
        setFormMode('edit');
        setFormModalOpen(true);
        setSelectedTest(null);
    };

    const handleDeleteConfirm = () => {
        if (testToDelete) {
            deleteMutation.mutate(testToDelete.id);
        }
    };

    const handleDownloadPDF = (test: ClinicalTest) => {
        try {
            generateClinicalTestPdf(test);
            toast.success('PDF gerado com sucesso!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Erro ao gerar PDF');
        }
    };

    const handleAddToProtocol = (test: ClinicalTest) => {
        setSelectedTest(test);
        setProtocolDialogOpen(true);
    };

    const confirmAddToProtocol = (protocolId: string) => {
        if (!selectedTest) return;

        const protocol = protocols.find(p => p.id === protocolId);
        if (!protocol) return;

        const currentTests = Array.isArray(protocol.clinical_tests) ? protocol.clinical_tests : [];
        if (currentTests.includes(selectedTest.id)) {
            toast.info('Este teste já está vinculado a este protocolo.');
            return;
        }

        updateProtocol({
            id: protocolId,
            clinical_tests: [...currentTests, selectedTest.id]
        });

        setProtocolDialogOpen(false);
    };

    // Derived filters based on user prototype
    // Primary Filters: Todos, Esportiva, Ortopedica, PosOp (mapped from test.category)
    // Secondary Filters (Buttons): Todos, Ombro, Joelho, Quadril... (mapped from test.target_joint)

    const filterTests = (criteria: string) => {
        setActiveFilter(criteria);
    };

    const filteredTests = tests.filter((test: ClinicalTest) => {
        const query = searchTerm.toLowerCase();
        const matchesSearch = test.name.toLowerCase().includes(query) ||
            (test.tags && test.tags.some((t: string) => t.toLowerCase().includes(query))) ||
            (test.target_joint && test.target_joint.toLowerCase().includes(query));

        let matchesCategory = true;
        if (activeFilter !== 'Todos') {
            // Logic to match the prototype's filters
            if (['Esportiva', 'Ortopedia', 'Pós-Operatório'].some(f => activeFilter.includes(f))) {
                // Now mapped directly to the new 'category' column
                matchesCategory = test.category === activeFilter;
            } else {
                // Assume it's a Body Part filter (Ombro, Joelho, etc), mapped to 'target_joint'
                matchesCategory = test.target_joint === activeFilter;
            }
        }

        return matchesSearch && matchesCategory;
    });

    const getBadgeColor = (category: string) => {
        switch (category) {
            case 'Esportiva': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'Pós-Operatório': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-blue-50 text-blue-700 border-blue-100'; // Ortopedia defaults here
        }
    };

    return (
        <MainLayout maxWidth="7xl" showBreadcrumbs={false}>
            <div className="min-h-screen bg-slate-50 text-slate-800 font-sans -mx-2 xs:-mx-4 md:mx-0">

                {/* Header - Matching User Design */}
                <header className="bg-teal-700 text-white sticky top-0 z-40 shadow-md">
                    <div className="px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <HeartPulse className="h-6 w-6" />
                            <h1 className="text-xl font-bold tracking-tight">PhysioTests DB</h1>
                        </div>
                        <nav className="hidden md:flex gap-6 text-sm font-medium">
                            <button onClick={() => filterTests('Todos')} className={`hover:text-teal-200 transition ${activeFilter === 'Todos' ? 'text-white font-bold underline decoration-2 underline-offset-4' : 'text-teal-100'}`}>Todos</button>
                            <button onClick={() => filterTests('Esportiva')} className={`hover:text-teal-200 transition ${activeFilter === 'Esportiva' ? 'text-white font-bold underline decoration-2 underline-offset-4' : 'text-teal-100'}`}>Esportiva</button>
                            <button onClick={() => filterTests('Ortopedia')} className={`hover:text-teal-200 transition ${activeFilter === 'Ortopedia' ? 'text-white font-bold underline decoration-2 underline-offset-4' : 'text-teal-100'}`}>Ortopedia</button>
                            <button onClick={() => filterTests('Pós-Operatório')} className={`hover:text-teal-200 transition ${activeFilter === 'Pós-Operatório' ? 'text-white font-bold underline decoration-2 underline-offset-4' : 'text-teal-100'}`}>Pós-Operatório</button>
                        </nav>
                        <Button
                            onClick={handleCreateNew}
                            size="sm"
                            className="bg-white text-teal-700 hover:bg-teal-50 font-semibold gap-1.5"
                        >
                            <Plus className="h-4 w-4" />
                            Novo Teste
                        </Button>
                    </div>
                </header>

                <main className="px-4 py-8 animate-fade-in pb-24">

                    {/* Search and Secondary Filter */}
                    <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100/80">
                        <div className="relative w-full md:w-96 group">
                            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 transition-colors group-focus-within:text-teal-600" />
                            <input
                                type="text"
                                placeholder="Buscar teste (ex: Lachman...)"
                                className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all text-sm font-medium placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide py-1">
                            {['Todos', 'Ombro', 'Joelho', 'Quadril', 'Tornozelo'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => filterTests(cat)}
                                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${activeFilter === cat
                                        ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-200 hover:text-teal-600'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid of Tests */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-0 flex flex-col h-[320px] overflow-hidden">
                                    <Skeleton className="h-40 w-full rounded-none" />
                                    <div className="p-5 flex-1 flex flex-col gap-3">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                        <div className="mt-auto flex gap-2">
                                            <Skeleton className="h-5 w-16 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTests.map((test: ClinicalTest) => {
                                // Determine badge style based on category
                                const badgeClass = getBadgeColor(test.category);

                                return (
                                    <div
                                        key={test.id}
                                        onClick={() => setSelectedTest(test)}
                                        className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col overflow-hidden group h-full relative"
                                    >
                                        <div className="h-40 bg-slate-50 relative overflow-hidden shrink-0 border-b border-slate-50">
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-300 bg-slate-50/50 group-hover:scale-105 transition-transform duration-500">
                                                <ImageIcon className="h-12 w-12 opacity-30" />
                                            </div>
                                            <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${badgeClass}`}>
                                                {test.category || 'Geral'}
                                            </div>
                                            {/* Hover overlay hint */}
                                            <div className="absolute inset-0 bg-teal-900/0 group-hover:bg-teal-900/5 transition-colors duration-300" />
                                        </div>

                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="text-[11px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider flex items-center justify-between">
                                                <span>{test.target_joint}</span>
                                                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-teal-600" />
                                            </div>

                                            <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-teal-700 transition-colors leading-tight">
                                                {test.name}
                                                {test.name_en && (
                                                    <span className="block text-xs font-normal text-slate-400 mt-1 italic">
                                                        {test.name_en}
                                                    </span>
                                                )}
                                            </h3>

                                            <p className="text-sm text-slate-500 line-clamp-3 mb-5 flex-1 leading-relaxed font-medium">
                                                {test.purpose}
                                            </p>

                                            <div className="flex gap-2 mt-auto flex-wrap pt-3 border-t border-slate-50">
                                                {test.tags?.slice(0, 2).map((tag: string) => (
                                                    <span key={tag} className="text-[10px] bg-slate-50 text-slate-500 px-2.5 py-1 rounded-md border border-slate-100 uppercase font-bold tracking-wide">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!isLoading && filteredTests.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                            <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-6 shadow-inner">
                                <Search className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum teste encontrado</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
                                Não encontramos resultados para sua busca. Tente termos mais genéricos ou limpe os filtros.
                            </p>
                            <Button
                                variant="outline"
                                className="border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 px-8"
                                onClick={() => { setSearchTerm(''); setActiveFilter('Todos'); }}
                            >
                                Limpar filtros
                            </Button>
                        </div>
                    )}

                </main>

                {/* Modal Details matching User Design */}
                <Dialog open={!!selectedTest} onOpenChange={(open) => !open && setSelectedTest(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 rounded-2xl">
                        {selectedTest && (
                            <>
                                {/* Modal Header */}
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 shrink-0">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-1 rounded">
                                                {selectedTest.category}
                                            </span>
                                            {selectedTest.regularity_sessions && (
                                                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-center gap-1">
                                                    <CalendarCheck className="h-3 w-3" />
                                                    A cada {selectedTest.regularity_sessions} sessões
                                                </span>
                                            )}
                                        </div>
                                        <DialogTitle className="text-2xl font-bold text-slate-800 leading-tight flex flex-col">
                                            <span>{selectedTest.name}</span>
                                            {selectedTest.name_en && (
                                                <span className="text-sm font-normal text-slate-400 italic mt-0.5">
                                                    {selectedTest.name_en}
                                                </span>
                                            )}
                                        </DialogTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEdit(selectedTest)}
                                            className="text-slate-400 hover:text-teal-600 transition p-2 bg-white rounded-full shadow-sm cursor-pointer border border-slate-100"
                                            title="Editar teste"
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTestToDelete(selectedTest);
                                                setDeleteDialogOpen(true);
                                            }}
                                            className="text-slate-400 hover:text-red-500 transition p-2 bg-white rounded-full shadow-sm cursor-pointer border border-slate-100"
                                            title="Excluir teste"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setSelectedTest(null)} className="text-slate-400 hover:text-red-500 transition p-2 bg-white rounded-full shadow-sm cursor-pointer border border-slate-100">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Body */}
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                                    {/* Left Column: Media */}
                                    <div className="space-y-4">
                                        <div className="w-full aspect-video rounded-xl overflow-hidden shadow-sm border border-slate-200 relative bg-slate-900 group cursor-pointer">
                                            {/* Placeholder for Video/GIF */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 bg-slate-900/50 backdrop-blur-[1px] group-hover:bg-slate-900/40 transition-all">
                                                <PlayCircle className="h-16 w-16 mb-3 text-white/90 group-hover:scale-110 group-hover:text-teal-400 transition-all duration-300 shadow-xl rounded-full bg-black/20" />
                                                <span className="text-sm font-semibold tracking-wide">Visualizar Movimento</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <MediaPlaceholder label="Posição Inicial" />
                                            <MediaPlaceholder label="Posição Final" />
                                        </div>
                                    </div>

                                    {/* Right Column: Info */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                <CheckSquare className="h-5 w-5 text-teal-600" />
                                                Execução
                                            </h3>
                                            <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                                                {selectedTest.execution || selectedTest.description}
                                            </p>
                                        </div>

                                        {selectedTest.positive_sign && (
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                    <ThumbsUp className="h-5 w-5 text-blue-600" />
                                                    Interpretação Positiva
                                                </h3>
                                                <p className="text-slate-600 text-sm bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 italic">
                                                    {selectedTest.positive_sign}
                                                </p>
                                            </div>
                                        )}

                                        {selectedTest.reference && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                                                    <Info className="h-4 w-4" />
                                                    Referências
                                                </h3>
                                                <p className="text-xs text-slate-400 italic">
                                                    {selectedTest.reference}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                                    <Button
                                        variant="outline"
                                        className="border-slate-300 text-slate-600 hover:bg-slate-100"
                                        onClick={() => handleDownloadPDF(selectedTest)}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Baixar PDF
                                    </Button>
                                    <Button
                                        className="bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 border-0"
                                        onClick={() => handleAddToProtocol(selectedTest)}
                                    >
                                        Adicionar ao Protocolo
                                    </Button>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Form Modal for Create/Edit */}
                <ClinicalTestFormModal
                    open={formModalOpen}
                    onOpenChange={setFormModalOpen}
                    test={testToEdit}
                    mode={formMode}
                />

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Teste Clínico</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem certeza que deseja excluir o teste "{testToDelete?.name}"?
                                Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteConfirm}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Excluir
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Protocol Selection Dialog */}
                <Dialog open={protocolDialogOpen} onOpenChange={setProtocolDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Adicionar ao Protocolo</DialogTitle>
                            <p className="text-sm text-slate-500">
                                Selecione um protocolo para vincular o teste "{selectedTest?.name}".
                            </p>
                        </DialogHeader>
                        <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {protocols.length === 0 && !isLoading && (
                                <p className="text-center py-8 text-slate-400 text-sm italic">
                                    Nenhum protocolo encontrado.
                                </p>
                            )}
                            {protocols.map((protocol) => (
                                <button
                                    key={protocol.id}
                                    onClick={() => confirmAddToProtocol(protocol.id)}
                                    className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 transition-all flex items-center justify-between group"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-800 group-hover:text-teal-700">{protocol.name}</p>
                                        <p className="text-xs text-slate-500">{protocol.condition_name}</p>
                                    </div>
                                    <div className="text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="outline" onClick={() => setProtocolDialogOpen(false)}>
                                Cancelar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </MainLayout>
    );
}
