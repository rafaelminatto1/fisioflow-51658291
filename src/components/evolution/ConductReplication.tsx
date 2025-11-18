import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
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
  const [activeTab, setActiveTab] = useState<'previous' | 'library'>('previous');

  const { data: soapRecords = [], isLoading: loadingRecords } = useSoapRecords(patientId, 20);
  const { data: conductLibrary = [], isLoading: loadingLibrary } = useConductLibrary();

  // Filtrar registros SOAP com plano preenchido
  const recordsWithPlan = soapRecords.filter(
    record => record.plan && record.plan.trim().length > 0
  );

  // Filtrar biblioteca
  const filteredLibrary = conductLibrary.filter(
    conduct =>
      conduct.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conduct.conduct_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="flex gap-2 border-b">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'previous'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('previous')}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              Condutas Anteriores ({recordsWithPlan.length})
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
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

          {/* Search */}
          {activeTab === 'library' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar na biblioteca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {/* Content */}
          <ScrollArea className="h-[400px]">
            {activeTab === 'previous' ? (
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
