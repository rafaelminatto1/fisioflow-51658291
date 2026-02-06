import React, { useState } from 'react';
import { collection, query, getDocs, orderBy as firestoreOrderBy, deleteDoc, doc } from '@/integrations/firebase/app';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {

    AlertCircle,
    HeartPulse,
    Plus,
} from 'lucide-react';
import { db } from '@/integrations/firebase/app';


// Extracted Components
import { ClinicalTestFormModal } from '@/components/clinical/ClinicalTestFormModal';
import { ClinicalTestsFilter } from '@/components/clinical/ClinicalTestsFilter';
import { ClinicalTestsGrid } from '@/components/clinical/ClinicalTestsGrid';
import { ClinicalTestDetailsModal } from '@/components/clinical/ClinicalTestDetailsModal';
import { ClinicalTestDeleteDialog } from '@/components/clinical/ClinicalTestDeleteDialog';
import { ClinicalTestProtocolDialog } from '@/components/clinical/ClinicalTestProtocolDialog';

import { useExerciseProtocols } from '@/hooks/useExerciseProtocols';

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

    const { data: tests = [], isLoading, isError, error, refetch } = useQuery({
        queryKey: ['clinical-tests-library'],
        queryFn: async () => {
            const q = query(
                collection(db, 'clinical_test_templates'),
                firestoreOrderBy('name')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ClinicalTest[];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (testId: string) => {
            await deleteDoc(doc(db, 'clinical_test_templates', testId));
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

    const handleAddToProtocol = (test: ClinicalTest) => {
        setSelectedTest(test); // Ensure context is kept
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
        toast.success(`Teste adicionado ao protocolo ${protocol.name}`);
    };

    const filterTests = (criteria: string) => {
        setActiveFilter(criteria);
    };

    const filteredTests = tests.filter((test: ClinicalTest) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = test.name.toLowerCase().includes(searchLower) ||
            (test.tags && test.tags.some((t: string) => t.toLowerCase().includes(searchLower))) ||
            (test.target_joint && test.target_joint.toLowerCase().includes(searchLower));

        let matchesCategory = true;
        if (activeFilter !== 'Todos') {
            if (['Esportiva', 'Ortopedia', 'Pós-Operatório'].some(f => activeFilter.includes(f))) {
                matchesCategory = test.category === activeFilter;
            } else {
                matchesCategory = test.target_joint === activeFilter;
            }
        }

        return matchesSearch && matchesCategory;
    });

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
                    {isError ? (
                        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
                                <AlertCircle className="h-10 w-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">Não foi possível carregar os testes</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
                                Verifique sua conexão e permissões. Se o problema persistir, tente novamente.
                            </p>
                            <Button
                                variant="outline"
                                className="border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 px-8"
                                onClick={() => refetch()}
                            >
                                Tentar novamente
                            </Button>
                        </div>
                    ) : (
                        <>
                            <ClinicalTestsFilter
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                activeFilter={activeFilter}
                                onFilterChange={filterTests}
                            />

                            <ClinicalTestsGrid
                                isLoading={isLoading}
                                tests={filteredTests}
                                onSelectTest={setSelectedTest}
                                onClearFilters={() => { setSearchTerm(''); setActiveFilter('Todos'); }}
                            />
                        </>
                    )}
                </main>

                <ClinicalTestDetailsModal
                    test={selectedTest}
                    isOpen={!!selectedTest}
                    onClose={() => setSelectedTest(null)}
                    onEdit={handleEdit}
                    onDelete={(test) => {
                        setTestToDelete(test);
                        setDeleteDialogOpen(true);
                    }}
                    onAddToProtocol={handleAddToProtocol}
                />

                <ClinicalTestFormModal
                    open={formModalOpen}
                    onOpenChange={setFormModalOpen}
                    test={testToEdit}
                    mode={formMode}
                />

                <ClinicalTestDeleteDialog
                    isOpen={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    testName={testToDelete?.name}
                    onConfirm={handleDeleteConfirm}
                />

                <ClinicalTestProtocolDialog
                    isOpen={protocolDialogOpen}
                    onClose={() => setProtocolDialogOpen(false)}
                    protocols={protocols}
                    isLoading={isLoading} // Reuse main query loading or handle separate protocol loading
                    testName={selectedTest?.name}
                    onConfirm={confirmAddToProtocol}
                />

            </div>
        </MainLayout>
    );
}
