import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Stethoscope, Activity, ArrowRight } from "lucide-react";
import { expandSearchQuery, normalizeForSearch } from "@/lib/utils/bilingualSearch";
import { physioDictionary, PhysioDictionaryEntry } from "@/data/physioDictionary";

interface BilingualSuggestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (term: string) => void;
}

export const BilingualSuggestionsModal: React.FC<BilingualSuggestionsModalProps> = ({
  open,
  onOpenChange,
  onSelect
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PhysioDictionaryEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const expandedQueries = expandSearchQuery(query);
    const normalizedQueries = expandedQueries.map(normalizeForSearch);
    
    // Search in local dictionary array
    const matchedEntries = physioDictionary.filter(entry => {
      const entryTerms = [
        normalizeForSearch(entry.pt),
        normalizeForSearch(entry.en),
        ...(entry.description_pt ? [normalizeForSearch(entry.description_pt)] : []),
        ...(entry.description_en ? [normalizeForSearch(entry.description_en)] : []),
        ...entry.aliases_pt.map(normalizeForSearch),
        ...entry.aliases_en.map(normalizeForSearch)
      ];

      // Check if any of the expanded queries are in the entry terms
      return normalizedQueries.some(nq => {
        return entryTerms.some(term => term.includes(nq) || nq.includes(term));
      });
    });

    setResults(matchedEntries.slice(0, 10)); // Limit to 10 results
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (entry: PhysioDictionaryEntry) => {
    const desc = entry.description_pt ? `: ${entry.description_pt}` : "";
    onSelect(`**${entry.pt}** (${entry.en})${desc}`);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 gap-0 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-800 dark:text-slate-100">Dicionário Clínico Bilingue</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Pesquise termos técnicos em PT/EN. Ex: ACL, LCP, Rotator Cuff
              </DialogDescription>
            </div>
          </div>
          
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite um termo, patologia ou diagnóstico..."
              className="pl-9 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-medium focus-visible:ring-blue-500"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {query ? "Nenhum termo encontrado" : "Comece a digitar para pesquisar"}
              </p>
              {query && (
                <p className="text-xs text-slate-400 mt-1">
                  Tente um sinônimo ou o termo em inglês
                </p>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {results.map((entry, idx) => (
                <button
                  key={entry.id}
                  onClick={() => handleSelect(entry)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-colors ${
                    idx === selectedIndex 
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent"
                  } border`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                    entry.category === "condition" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" :
                    entry.category === "test" || entry.category === "procedure" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600" :
                    "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                  }`}>
                    {entry.category === "condition" ? <Activity className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{entry.pt}</span>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                        {entry.en}
                      </span>
                    </div>
                    {entry.description_pt && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {entry.description_pt}
                      </p>
                    )}
                  </div>
                  <ArrowRight className={`w-4 h-4 mt-2 shrink-0 transition-opacity ${
                    idx === selectedIndex ? "opacity-100 text-blue-500" : "opacity-0"
                  }`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
