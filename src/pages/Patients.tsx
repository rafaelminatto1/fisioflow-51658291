import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewPatientModal } from '@/components/modals/NewPatientModal';
import { EditPatientModal } from '@/components/modals/EditPatientModal';
import { ViewPatientModal } from '@/components/modals/ViewPatientModal';
import { useActivePatients } from '@/hooks/usePatients';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Phone,
  Mail,
  Users,
  Filter,
  Download,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [editingPatient, setEditingPatient] = useState<string | null>(null);
  const [viewingPatient, setViewingPatient] = useState<string | null>(null);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const { data: patients = [], isLoading: loading } = useActivePatients();
  const { toast } = useToast();

  // Get unique conditions and statuses for filters
  const uniqueConditions = useMemo(() => {
    const conditions = [...new Set(patients.map(p => p.mainCondition).filter(Boolean))];
    return conditions.sort();
  }, [patients]);

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const matchesSearch = 
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.mainCondition || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
      const matchesCondition = conditionFilter === 'all' || patient.mainCondition === conditionFilter;
      
      return matchesSearch && matchesStatus && matchesCondition;
    });
  }, [patients, searchTerm, statusFilter, conditionFilter]);

  const getPatientAge = (birthDate: Date) => {
    try {
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1;
      }
      return age;
    } catch {
      return 0;
    }
  };

  const exportPatients = () => {
    try {
      const csvContent = [
        'Nome,Email,Telefone,Idade,Gênero,Condição Principal,Status,Progresso',
        ...filteredPatients.map(patient => [
          patient.name,
          patient.email || '',
          patient.phone || '',
          getPatientAge(new Date(patient.birthDate)),
          patient.gender,
          patient.mainCondition,
          patient.status,
          patient.progress
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'pacientes.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast({
        title: 'Exportação concluída!',
        description: 'Lista de pacientes exportada com sucesso.',
      });
    } catch {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar a lista de pacientes.',
        variant: 'destructive',
      });
    }
  };

  // Show loading state
  if (loading) {
    return (
      <MainLayout>
        <LoadingSkeleton type="card" rows={4} />
      </MainLayout>
    );
  }



  const getStatusColor = (status: string) => {
    const colors = {
      'Inicial': 'bg-blue-100 text-blue-800',
      'Em Tratamento': 'bg-green-100 text-green-800',
      'Recuperação': 'bg-yellow-100 text-yellow-800',
      'Concluído': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground">
              {filteredPatients.length} de {patients.length} pacientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportPatients}
              className="hidden sm:flex"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={() => setIsNewPatientModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Paciente
        </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Buscar por nome, condição, email ou telefone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Filter className="w-4 h-4 text-muted-foreground" />
              </div>
              
              <div className="flex gap-4 flex-wrap">
                <div className="min-w-[150px]">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="Inicial">Inicial</SelectItem>
                      <SelectItem value="Em Tratamento">Em Tratamento</SelectItem>
                      <SelectItem value="Recuperação">Recuperação</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="min-w-[200px]">
                  <Select value={conditionFilter} onValueChange={setConditionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Condição" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Condições</SelectItem>
                      {uniqueConditions.map((condition) => (
                        <SelectItem key={String(condition)} value={String(condition)}>
                          {String(condition)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {(statusFilter !== 'all' || conditionFilter !== 'all' || searchTerm) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setConditionFilter('all');
                    }}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        {filteredPatients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            description={
              searchTerm 
                ? 'Tente ajustar os filtros de busca.' 
                : 'Comece adicionando seu primeiro paciente.'
            }
            action={
              !searchTerm
                ? {
                    label: 'Novo Paciente',
                    onClick: () => setIsNewPatientModalOpen(true)
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-6">
            {filteredPatients.map((patient) => (
              <Card key={patient.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-xl">{patient.name}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{getPatientAge(new Date(patient.birthDate))} anos</span>
                          <span>{patient.gender}</span>
                          {patient.mainCondition && (
                            <span className="font-medium">{patient.mainCondition}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(patient.status)}>
                        {patient.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {patient.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{patient.email}</span>
                      </div>
                    )}
                    {patient.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {patient.progress}%
                    </div>
                    <div className="text-xs text-muted-foreground">Progresso do Tratamento</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setViewingPatient(patient.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingPatient(patient.id)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewPatientModal
        open={isNewPatientModalOpen}
        onOpenChange={setIsNewPatientModalOpen}
      />
      
      {editingPatient && (
        <EditPatientModal
          patientId={editingPatient}
          open={true}
          onOpenChange={() => setEditingPatient(null)}
        />
      )}

      {viewingPatient && (
        <ViewPatientModal
          patientId={viewingPatient}
          open={true}
          onOpenChange={() => setViewingPatient(null)}
        />
      )}
    </MainLayout>
  );
};

export default Patients;