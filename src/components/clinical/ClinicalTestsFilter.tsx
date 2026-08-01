import type { RefObject } from "react";
import { Search, X } from "lucide-react";

interface ClinicalTestsFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  categories: readonly string[];
  joints: readonly string[];
  totalCount: number;
  filteredCount: number;
  inputRef?: RefObject<HTMLInputElement | null>;
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition-[color,background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
        active
          ? "border-sky-500 bg-sky-500 text-white shadow-[0_5px_14px_rgba(14,165,233,0.22)]"
          : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700"
      }`}
    >
      {label}
    </button>
  );
}

export function ClinicalTestsFilter({
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
  categories,
  joints,
  totalCount,
  filteredCount,
  inputRef,
}: ClinicalTestsFilterProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">
            Busca clínica
          </p>
          <p className="mt-1 text-sm font-bold text-slate-700">
            {filteredCount} de {totalCount} testes disponíveis
          </p>
        </div>

        <div className="relative w-full lg:max-w-[430px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            id="search-clinical-tests"
            name="search-clinical-tests"
            type="search"
            placeholder="Buscar teste, patologia, articulação..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-20 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Limpar busca"
              className="absolute right-10 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-black text-slate-400 shadow-sm">
            /
          </kbd>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[auto_1px_1fr] lg:gap-5 lg:px-5">
        <div>
          <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
            Categorias
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <FilterChip
                key={category}
                label={category}
                active={activeFilter === category}
                onClick={() => onFilterChange(category)}
              />
            ))}
          </div>
        </div>

        <div className="hidden bg-slate-200 lg:block" aria-hidden="true" />

        <div>
          <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
            Regiões e foco anatômico
          </p>
          <div className="flex flex-wrap gap-1.5">
            {joints
              .filter((joint) => joint !== "Todos")
              .map((joint) => (
                <FilterChip
                  key={joint}
                  label={joint}
                  active={activeFilter === joint}
                  onClick={() => onFilterChange(joint)}
                />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
