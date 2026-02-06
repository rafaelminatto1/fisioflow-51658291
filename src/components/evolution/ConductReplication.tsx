import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Copy, Search, Clock, Library, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSoapRecords } from '@/hooks/useSoapRecords';
import { useConductLibrary } from '@/hooks/useConductLibrary';
import { useIntelligentConductSuggestions } from '@/hooks/useIntelligentConductSuggestions';
import { Sparkles } from 'lucide-react';

interface ConductReplicationProps {
  patientId: string;
  onSelectConduct: (conduct: string) => void;
}

export const ConductReplication: React.FC<ConductReplicationProps> = ({
  patientId,
  onSelectConduct
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'suggestions' | 'previous' | 'library'>('suggestions');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: soapRecords = [], isLoading: loadingRecords } = useSoapRecords(patientId, 20);
  const { data: conductLibrary = [], isLoading: loadingLibrary } = useConductLibrary();
  const { data: suggestions = [], isLoading: loadingSuggestions } = useIntelligentConductSuggestions(patientId);

  // Filtrar registros SOAP com plano preenchido
  const recordsWithPlan = soapRecords.filter(
    record => record.plan && record.plan.trim().length > 0
  );

  // Obter categorias únicas
  const categories = ['all', ...Array.from(new Set(conductLibrary.map(c => c.category)))];

  // Filtrar biblioteca
  const filteredLibrary = conductLibrary.filter(conduct => {
    const matchesSearch = conduct.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conduct.conduct_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || conduct.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectRecord = (plan: string) => {
    onSelectConduct(plan);
    setIsOpen(false);
  };

  const handleSelectLibraryItem = (conductText: string) => {
    onSelectConduct(conductText);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          Replicar Conduta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Replicar Conduta</DialogTitle>
          <DialogDescription>
            Selecione uma conduta anterior deste paciente ou da biblioteca para copiar para o plano atual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b overflow-x-auto">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'suggestions'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('suggestions')}
            >
              <Sparkles className="h-4 w-4 inline mr-2" />
              Sugestões IA ({suggestions.length})
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'previous'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('previous')}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              Anteriores ({recordsWithPlan.length})
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'library'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('library')}
            >
              <Library className="h-4 w-4 inline mr-2" />
              Biblioteca ({conductLibrary.length})
            </button>
          </div>

          {/* Search and Filters */}
          {activeTab === 'library' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na biblioteca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <Badge
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/10 whitespace-nowrap"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === 'all' ? 'Todas' : cat}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <ScrollArea className="h-[400px]">
            {activeTab === 'suggestions' ? (
              <div className="space-y-2">
                {loadingSuggestions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="font-medium mb-1">Nenhuma sugestão disponível</p>
                    <p className="text-xs">
                      Registre patologias e evoluções para receber sugestões personalizadas
                    </p>
                  </div>
                ) : (
                  suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleSelectLibraryItem(suggestion.conduct_text)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{suggestion.title}</span>
                            <Badge variant="secondary" className="text-xs">
                              {suggestion.relevance_score}% relevante
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {suggestion.reason}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2">
                          {suggestion.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {suggestion.conduct_text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'previous' ? (
              <div className="space-y-2">
                {loadingRecords ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recordsWithPlan.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma conduta anterior registrada</p>
                  </div>
                ) : (
                  recordsWithPlan.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleSelectRecord(record.plan!)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {format(new Date(record.record_date), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR
                          })}
                        </span>
                        {record.signed_at && (
                          <Badge variant="secondary" className="text-xs">
                            Assinado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {record.plan}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {loadingLibrary ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLibrary.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Library className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>
                      {searchTerm
                        ? 'Nenhuma conduta encontrada'
                        : 'Biblioteca vazia. Salve suas condutas favoritas para reutilização rápida.'}
                    </p>
                  </div>
                ) : (
                  filteredLibrary.map((conduct) => (
                    <div
                      key={conduct.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleSelectLibraryItem(conduct.conduct_text)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{conduct.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {conduct.category}
                        </Badge>
                      </div>
                      {conduct.description && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {conduct.description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {conduct.conduct_text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
