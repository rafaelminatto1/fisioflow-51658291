import { useState } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Eye } from 'lucide-react';
import { NewPatientModal } from '@/components/modals/NewPatientModal';
import { ViewPatientModal } from '@/components/modals/ViewPatientModal';
import { EditPatientModal } from '@/components/modals/EditPatientModal';
import type { Patient } from '@/types';

export function PatientsManager() {
  const { data: patients = [], isLoading } = usePatients();
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  );

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Paciente
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.email || '-'}</TableCell>
                    <TableCell>{patient.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={patient.status === 'Em Tratamento' ? 'default' : 'secondary'}>
                        {patient.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewPatient(patient)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditPatient(patient)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <NewPatientModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
      />

      {viewPatient && (
        <ViewPatientModal
          open={!!viewPatient}
          onOpenChange={(open) => !open && setViewPatient(null)}
          patientId={viewPatient.id}
        />
      )}

      {editPatient && (
        <EditPatientModal
          open={!!editPatient}
          onOpenChange={(open) => !open && setEditPatient(null)}
          patientId={editPatient.id}
        />
      )}
    </>
  );
}
