import { useState, useMemo } from 'react';
import { ExerciseProtocol } from './useExerciseProtocols';
import { getProtocolCategory } from '@/data/protocols';

// Helper for consistent case-insensitive checking
const includesTerm = (text: string, term: string) =>
    text.toLowerCase().includes(term.toLowerCase());

export function useProtocolFilters(protocols: ExerciseProtocol[]) {
    const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [muscleFilter, setMuscleFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const filteredProtocols = useMemo(() => {
        // Optimize: If no protocols, return empty immediately
        if (!protocols.length) return [];

        return protocols.filter(p => {
            // 1. Active Template Filter
            if (activeTemplate) {
                switch (activeTemplate) {
                    case 'Pós-Cirúrgico Ortopédico':
                        if (p.protocol_type !== 'pos_operatorio') return false;
                        break;
                    case 'Tratamento Conservador':
                        if (p.protocol_type !== 'patologia') return false;
                        break;
                    case 'Reabilitação Esportiva': {
                        const isSports = includesTerm(p.condition_name, 'esport') ||
                            includesTerm(p.name, 'esport') ||
                            includesTerm(p.name, 'atleta');
                        if (!isSports) return false;
                        break;
                    }
                    case 'Idosos e Geriatria': {
                        const isElderly = includesTerm(p.condition_name, 'idoso') ||
                            includesTerm(p.name, 'idoso') ||
                            includesTerm(p.condition_name, 'geriatria') ||
                            includesTerm(p.name, 'geriatria');
                        if (!isElderly) return false;
                        break;
                    }
                }
            }

            // 2. Search Filter
            if (search) {
                const matchesSearch = includesTerm(p.name, search) ||
                    includesTerm(p.condition_name, search);
                if (!matchesSearch) return false;
            }

            // 3. Category Filter
            if (categoryFilter !== 'all') {
                const category = getProtocolCategory(p.condition_name);
                if (category !== categoryFilter) return false;
            }

            // 4. Musculature Filter
            if (muscleFilter !== 'all') {
                const muscleMatch = includesTerm(p.name, muscleFilter) ||
                    includesTerm(p.condition_name, muscleFilter) ||
                    includesTerm(JSON.stringify(p.milestones), muscleFilter);

                if (!muscleMatch) return false;
            }

            return true;
        });
    }, [protocols, search, activeTemplate, categoryFilter, muscleFilter]);

    return {
        activeTemplate,
        setActiveTemplate,
        search,
        setSearch,
        categoryFilter,
        setCategoryFilter,
        muscleFilter,
        setMuscleFilter,
        viewMode,
        setViewMode,
        filteredProtocols
    };
}
