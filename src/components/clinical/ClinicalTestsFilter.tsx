
import React from 'react';
import { Search } from 'lucide-react';

interface ClinicalTestsFilterProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    activeFilter: string;
    onFilterChange: (filter: string) => void;
}

const CATEGORIES = ['Todos', 'Ombro', 'Joelho', 'Quadril', 'Tornozelo'];

export function ClinicalTestsFilter({
    searchTerm,
    onSearchChange,
    activeFilter,
    onFilterChange
}: ClinicalTestsFilterProps) {
    return (
        <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100/80">
            <div className="relative w-full md:w-96 group">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5 transition-colors group-focus-within:text-teal-600" />
                <input
                    type="text"
                    placeholder="Buscar teste (ex: Lachman...)"
                    className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all text-sm font-medium placeholder:text-gray-500"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide py-1">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => onFilterChange(cat)}
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
    );
}
