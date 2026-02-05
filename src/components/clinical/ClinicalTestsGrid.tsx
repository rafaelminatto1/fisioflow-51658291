
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface ClinicalTestsGridProps {
    isLoading: boolean;
    tests: ClinicalTest[];
    onSelectTest: (test: ClinicalTest) => void;
    onClearFilters: () => void;
}

export function ClinicalTestsGrid({
    isLoading,
    tests,
    onSelectTest,
    onClearFilters
}: ClinicalTestsGridProps) {

    const getBadgeColor = (category: string) => {
        switch (category) {
            case 'Esportiva': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'Pós-Operatório': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-blue-50 text-blue-700 border-blue-100'; // Ortopedia defaults here
        }
    };

    if (isLoading) {
        return (
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
        );
    }

    if (tests.length === 0) {
        return (
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
                    onClick={onClearFilters}
                >
                    Limpar filtros
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test: ClinicalTest) => {
                const badgeClass = getBadgeColor(test.category);

                return (
                    <div
                        key={test.id}
                        onClick={() => onSelectTest(test)}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col overflow-hidden group h-full relative"
                    >
                        <div className="h-40 bg-slate-50 relative overflow-hidden shrink-0 border-b border-slate-50">
                            <div className="absolute inset-0 flex items-center justify-center text-slate-300 bg-slate-50/50 group-hover:scale-105 transition-transform duration-500">
                                <ImageIcon className="h-12 w-12 opacity-30" />
                            </div>
                            <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${badgeClass}`}>
                                {test.category || 'Geral'}
                            </div>
                            <div className="absolute inset-0 bg-teal-900/0 group-hover:bg-teal-900/5 transition-colors duration-300" />
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="text-[11px] text-gray-500 font-bold mb-1.5 uppercase tracking-wider flex items-center justify-between">
                                <span>{test.target_joint}</span>
                                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-teal-600" />
                            </div>

                            <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-teal-700 transition-colors leading-tight">
                                {test.name}
                                {test.name_en && (
                                    <span className="block text-xs font-normal text-gray-500 mt-1 italic">
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
    );
}
