import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, collection, getDocs, query as firestoreQuery, orderBy } from '@/integrations/firebase/app';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Search,
    BookOpen,
    Plus,
    HeartPulse,
    Info,
    Eye,
    EyeOff,
    X,
    ChevronDown,
    ChevronRight,
    Check,
    Sparkles,
    Bone,
    TrendingUp,
    Activity,
    Brain,
    Wind,
    Armchair,
    Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ClinicalTest {
    id: string;
    name: string;
    name_en?: string;
    category: string;
    target_joint: string;
    purpose?: string;
    execution?: string;
    positive_sign?: string;
    tags?: string[];
    type?: string;
    media_urls?: string[];
    image_url?: string;
    layout_type?: 'single' | 'multi_field' | 'y_balance' | 'radial';
    fields_definition?: Array<{
        id: string;
        label: string;
        unit?: string;
        type: string;
        required?: boolean;
        description?: string;
    }>;
}

interface TestLibraryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddTest: (test: ClinicalTest) => void;
    patientId?: string;
}

const CATEGORIES = [
    { id: 'Todos', label: 'Todos', icon: BookOpen, color: 'bg-slate-50 text-slate-700 border-slate-200' },
    { id: 'Esportiva', label: 'Esportiva', icon: TrendingUp, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { id: 'Ortopedia', label: 'Ortopedia', icon: Bone, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'Pós-Operatório', label: 'Pós-Operatório', icon: Activity, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'Neurológico', label: 'Neurológico', icon: Brain, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'Respiratório', label: 'Respiratório', icon: Wind, color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
];

const JOINTS = ['Todos', 'Ombro', 'Joelho', 'Quadril', 'Tornozelo', 'Coluna', 'Cervical', 'Punho', 'Cotovelo', 'Mão', 'Quadril', 'Pelve'];

const TEST_TYPES = [
    { id: 'all', label: 'Todos' },
    { id: 'special_test', label: 'Testes Especiais' },
    { id: 'functional_test', label: 'Testes Funcionais' },
];

export function TestLibraryModal({ open, onOpenChange, onAddTest, patientId }: TestLibraryModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [selectedJoint, setSelectedJoint] = useState('Todos');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedTest, setSelectedTest] = useState<ClinicalTest | null>(null);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Load recent tests from localStorage
    useEffect(() => {
        if (open && patientId) {
            const saved = localStorage.getItem(`recent-tests-${patientId}`);
            if (saved) {
                setRecentlyAdded(new Set(JSON.parse(saved)));
            }
        }
    }, [open, patientId]);

    // Focus search on open
    useEffect(() => {
        if (open) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            // Reset state on close
            setSearchTerm('');
            setSelectedCategory('Todos');
            setSelectedJoint('Todos');
            setSelectedType('all');
            setSelectedTest(null);
            setFocusedIndex(-1);
        }
    }, [open]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!open) return;

            const filtered = getFilteredTests();

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex(prev => Math.min(prev + 1, filtered.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (focusedIndex >= 0 && filtered[focusedIndex]) {
                        handleAddTest(filtered[focusedIndex]);
                    }
                    break;
                case 'Escape':
                    if (selectedTest) {
                        setSelectedTest(null);
                    } else {
                        onOpenChange(false);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, focusedIndex, selectedTest]);

    const { data: tests = [], isLoading } = useQuery({
        queryKey: ['clinical-tests-library'],
        queryFn: async () => {
            const q = firestoreQuery(
                collection(db, 'clinical_test_templates'),
                orderBy('name')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ClinicalTest[];
        },
        enabled: open,
    });

    const getFilteredTests = useCallback(() => {
        return tests.filter(test => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                test.name.toLowerCase().includes(searchLower) ||
                (test.name_en && test.name_en.toLowerCase().includes(searchLower)) ||
                (test.tags && test.tags.some(t => t.toLowerCase().includes(searchLower))) ||
                (test.target_joint && test.target_joint.toLowerCase().includes(searchLower)) ||
                (test.purpose && test.purpose.toLowerCase().includes(searchLower));

            const matchesCategory = selectedCategory === 'Todos' || test.category === selectedCategory;
            const matchesJoint = selectedJoint === 'Todos' || test.target_joint === selectedJoint;
            const matchesType = selectedType === 'all' || test.type === selectedType;

            return matchesSearch && matchesCategory && matchesJoint && matchesType;
        });
    }, [tests, searchTerm, selectedCategory, selectedJoint, selectedType]);

    const filteredTests = useMemo(() => getFilteredTests(), [getFilteredTests]);

    const groupedTests = useMemo(() => {
        const groups: Record<string, ClinicalTest[]> = {};
        filteredTests.forEach(test => {
            const category = test.category || 'Outros';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(test);
        });
        return groups;
    }, [filteredTests]);

    const recentTests = useMemo(() => {
        return tests.filter(test => recentlyAdded.has(test.id));
    }, [tests, recentlyAdded]);

    const handleAddTest = useCallback((test: ClinicalTest, closeAfter = true) => {
        onAddTest(test);
        toast.success(`"${test.name}" adicionado à medição`, {
            icon: <Check className="h-4 w-4 text-teal-500" />,
        });

        // Add to recent
        const newRecent = new Set(recentlyAdded);
        newRecent.add(test.id);
        // Keep only last 10
        if (newRecent.size > 10) {
            const first = Array.from(newRecent)[0];
            newRecent.delete(first);
        }
        setRecentlyAdded(newRecent);
        if (patientId) {
            localStorage.setItem(`recent-tests-${patientId}`, JSON.stringify(Array.from(newRecent)));
        }

        if (closeAfter) {
            onOpenChange(false);
        } else {
            setSelectedTest(null);
        }
    }, [onAddTest, recentlyAdded, patientId, onOpenChange]);

    const toggleCategory = (category: string) => {
        setCollapsedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    const getCategoryIcon = (category: string) => {
        return CATEGORIES.find(c => c.id === category)?.icon || BookOpen;
    };

    const getCategoryColor = (category: string) => {
        return CATEGORIES.find(c => c.id === category)?.color || CATEGORIES[0].color;
    };

    const getTestTypeIcon = (type?: string) => {
        return type === 'functional_test' ? TrendingUp : Sparkles;
    };

    // Render test card
    const renderTestCard = (test: ClinicalTest, index: number) => {
        const CategoryIcon = getCategoryIcon(test.category);
        const TypeIcon = getTestTypeIcon(test.type);
        const isFocused = focusedIndex === index;
        const hasImage = test.image_url || test.media_urls?.[0];

        return (
            <div
                key={test.id}
                className={cn(
                    "group flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                    "bg-white hover:border-teal-300 hover:shadow-md",
                    selectedTest?.id === test.id
                        ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-200"
                        : "border-slate-200",
                    isFocused && "ring-2 ring-teal-300 ring-offset-1"
                )}
                onClick={() => setSelectedTest(test)}
                onMouseEnter={() => setFocusedIndex(index)}
            >
                {/* Icon */}
                <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                    getCategoryColor(test.category)
                )}>
                    <CategoryIcon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800 truncate">
                            {test.name}
                        </span>
                        <TypeIcon className="h-3 w-3 text-slate-400 shrink-0" />
                        {test.target_joint && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-medium shrink-0 bg-slate-100 text-slate-600 border-slate-200">
                                {test.target_joint}
                            </Badge>
                        )}
                    </div>

                    {test.purpose && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">
                            {test.purpose}
                        </p>
                    )}

                    {test.tags && test.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                            {test.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-[9px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                                    #{tag}
                                </span>
                            ))}
                            {test.tags.length > 3 && (
                                <span className="text-[9px] text-slate-400">+{test.tags.length - 3}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddTest(test, false);
                        }}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                    {hasImage && (
                        <div className="flex items-center justify-center w-7 h-7 rounded bg-slate-100 text-slate-400">
                            <Eye className="h-3.5 w-3.5" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-teal-600 to-teal-700 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <HeartPulse className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                                    Biblioteca de Testes
                                    <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 text-xs">
                                        {tests.length}
                                    </Badge>
                                </DialogTitle>
                                <p className="text-teal-100 text-sm">
                                    Pesquise e adicione testes à evolução do paciente
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="hidden md:flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
                                <Keyboard className="h-3.5 w-3.5 text-white/70" />
                                <span className="text-xs text-white/80">↑↓ navegar • Enter adicionar • Esc fechar</span>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel - List */}
                    <div className="flex-1 flex flex-col min-w-0 border-r">
                        {/* Search and Filters */}
                        <div className="p-4 border-b bg-slate-50 space-y-3 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Buscar por nome, categoria, articulação ou tags..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-11 border-slate-200 focus-visible:ring-teal-400"
                                />
                                {searchTerm && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>

                            {/* Type Filter */}
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center">Tipo:</span>
                                {TEST_TYPES.map(type => (
                                    <Button
                                        key={type.id}
                                        variant={selectedType === type.id ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedType(type.id)}
                                        className={cn(
                                            "h-7 px-3 text-xs font-medium whitespace-nowrap shrink-0",
                                            selectedType === type.id
                                                ? "bg-violet-600 hover:bg-violet-700 text-white"
                                                : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                                        )}
                                    >
                                        {type.label}
                                    </Button>
                                ))}
                            </div>

                            {/* Category Filter */}
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center">Categoria:</span>
                                {CATEGORIES.map(cat => {
                                    const Icon = cat.icon;
                                    return (
                                        <Button
                                            key={cat.id}
                                            variant={selectedCategory === cat.id ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={cn(
                                                "h-7 px-2.5 text-xs font-medium whitespace-nowrap shrink-0 gap-1",
                                                selectedCategory === cat.id
                                                    ? cat.color.split(' ').slice(0, 2).join(' ').replace('50', '600')
                                                    : "border-slate-200 hover:bg-slate-100"
                                            )}
                                        >
                                            <Icon className="h-3 w-3" />
                                            {cat.label}
                                        </Button>
                                    );
                                })}
                            </div>

                            {/* Joint Filter */}
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center">Articulação:</span>
                                {JOINTS.map(joint => (
                                    <Button
                                        key={joint}
                                        variant={selectedJoint === joint ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedJoint(joint)}
                                        className={cn(
                                            "h-7 px-2.5 text-xs font-medium whitespace-nowrap shrink-0",
                                            selectedJoint === joint
                                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                                        )}
                                    >
                                        {joint}
                                    </Button>
                                ))}
                            </div>

                            {/* Clear filters */}
                            {(searchTerm || selectedCategory !== 'Todos' || selectedJoint !== 'Todos' || selectedType !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedCategory('Todos');
                                        setSelectedJoint('Todos');
                                        setSelectedType('all');
                                    }}
                                    className="h-7 text-xs text-slate-500 hover:text-slate-700"
                                >
                                    Limpar filtros
                                </Button>
                            )}
                        </div>

                        {/* Results */}
                        <ScrollArea className="flex-1">
                            <div className="px-4 py-3 space-y-4">
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-center">
                                            <div className="flex justify-center gap-1 mb-3">
                                                <div className="h-2 w-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="h-2 w-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="h-2 w-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">Carregando testes...</p>
                                        </div>
                                    </div>
                                ) : filteredTests.length === 0 ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <BookOpen className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <p className="text-sm text-slate-600 font-semibold mb-1">
                                                Nenhum teste encontrado
                                            </p>
                                            <p className="text-xs text-slate-500 mb-3">
                                                Tente ajustar os filtros ou a busca
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setSelectedCategory('Todos');
                                                    setSelectedJoint('Todos');
                                                    setSelectedType('all');
                                                }}
                                            >
                                                Limpar filtros
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Recent Tests */}
                                        {recentTests.length > 0 && !searchTerm && selectedCategory === 'Todos' && selectedJoint === 'Todos' && selectedType === 'all' && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                                                    <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                                                    Recentes
                                                </div>
                                                <div className="grid gap-2">
                                                    {recentTests.slice(0, 5).map(test => renderTestCard(test, 0))}
                                                </div>
                                                <Separator />
                                            </div>
                                        )}

                                        {/* Grouped Tests */}
                                        <div className="space-y-4">
                                            {Object.entries(groupedTests).map(([category, categoryTests]) => {
                                                const isCollapsed = collapsedCategories.has(category);
                                                const CategoryIcon = getCategoryIcon(category);
                                                let globalIndex = recentTests.length > 0 && !searchTerm && selectedCategory === 'Todos' && selectedJoint === 'Todos' && selectedType === 'all' ? 5 : 0;

                                                return (
                                                    <div key={category} className="space-y-3">
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full justify-start h-auto px-0 hover:bg-transparent"
                                                            onClick={() => toggleCategory(category)}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {isCollapsed ? (
                                                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                                                ) : (
                                                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                                                )}
                                                                <Badge className={cn("text-xs font-bold px-2 py-0.5", getCategoryColor(category))}>
                                                                    <CategoryIcon className="h-3 w-3 mr-1" />
                                                                    {category}
                                                                </Badge>
                                                                <span className="text-xs text-slate-500 font-medium">
                                                                    {categoryTests.length}
                                                                </span>
                                                            </div>
                                                        </Button>

                                                        {!isCollapsed && (
                                                            <div className="grid gap-2">
                                                                {categoryTests.map(test => renderTestCard(test, globalIndex++))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t bg-slate-50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Info className="h-3.5 w-3.5" />
                                <span>
                                    {filteredTests.length} teste{filteredTests.length !== 1 ? 's' : ''} disponível{filteredTests.length !== 1 ? 'is' : ''}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="h-7"
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>

                    {/* Right Panel - Test Details */}
                    {selectedTest && (
                        <div className="w-96 bg-slate-50 flex flex-col shrink-0 border-l">
                            <div className="p-4 border-b bg-white flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-800">{selectedTest.name}</h3>
                                    {selectedTest.name_en && (
                                        <p className="text-xs text-slate-500 italic">{selectedTest.name_en}</p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setSelectedTest(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-4">
                                    {/* Image */}
                                    {(selectedTest.image_url || selectedTest.media_urls?.[0]) && (
                                        <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
                                            <img
                                                src={selectedTest.image_url || selectedTest.media_urls?.[0]}
                                                alt={selectedTest.name}
                                                className="w-full h-48 object-contain bg-slate-50"
                                            />
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-2">
                                        <Badge className={getCategoryColor(selectedTest.category)}>
                                            {selectedTest.category}
                                        </Badge>
                                        {selectedTest.target_joint && (
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
                                                {selectedTest.target_joint}
                                            </Badge>
                                        )}
                                        {selectedTest.type && (
                                            <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200">
                                                {selectedTest.type === 'functional_test' ? 'Funcional' : 'Especial'}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Purpose */}
                                    {selectedTest.purpose && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-700 uppercase mb-1.5">Objetivo</h4>
                                            <p className="text-sm text-slate-600 leading-relaxed">{selectedTest.purpose}</p>
                                        </div>
                                    )}

                                    {/* Execution */}
                                    {selectedTest.execution && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-700 uppercase mb-1.5">Execução</h4>
                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedTest.execution}</p>
                                        </div>
                                    )}

                                    {/* Positive Sign */}
                                    {selectedTest.positive_sign && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-700 uppercase mb-1.5">Sinal Positivo</h4>
                                            <p className="text-sm text-slate-600 leading-relaxed">{selectedTest.positive_sign}</p>
                                        </div>
                                    )}

                                    {/* Tags */}
                                    {selectedTest.tags && selectedTest.tags.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-700 uppercase mb-1.5">Tags</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedTest.tags.map(tag => (
                                                    <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Fields */}
                                    {selectedTest.fields_definition && selectedTest.fields_definition.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-700 uppercase mb-1.5">Campos do Formulário</h4>
                                            <div className="space-y-1.5">
                                                {selectedTest.fields_definition.map(field => (
                                                    <div key={field.id} className="flex items-center justify-between text-xs bg-white px-2 py-1.5 rounded border border-slate-200">
                                                        <span className="font-medium text-slate-700">{field.label}</span>
                                                        <div className="flex items-center gap-2">
                                                            {field.unit && <span className="text-slate-400">({field.unit})</span>}
                                                            {field.required && <span className="text-red-500">*</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Add Button */}
                            <div className="p-4 border-t bg-white">
                                <Button
                                    className="w-full bg-teal-600 hover:bg-teal-700"
                                    onClick={() => handleAddTest(selectedTest)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Adicionar à medição
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
