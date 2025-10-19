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
      <div className="space-y-6 animate-fade-in">
        {/* Header moderno com stats */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Pacientes
              </h1>
              <p className="text-muted-foreground">
                Gerencie o cadastro e evolução dos seus pacientes
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={exportPatients}
                className="hidden sm:flex shadow-md hover:shadow-lg transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button 
                className="shadow-md hover:shadow-lg transition-all"
                onClick={() => setIsNewPatientModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Novo Paciente</span>
              </Button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-medical">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{patients.length}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {patients.filter(p => p.status === 'Em Tratamento').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {patients.filter(p => p.status === 'Inicial').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Novos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {patients.filter(p => p.status === 'Concluído').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Search and Filters - Modernizados */}
        <Card className="shadow-card">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-4">
              {/* Busca principal */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Buscar pacientes por nome, condição, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-background/50"
                />
              </div>
              
              {/* Filtros em grid responsivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue placeholder="Filtrar por status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📋 Todos os Status</SelectItem>
                    <SelectItem value="Inicial">🆕 Inicial</SelectItem>
                    <SelectItem value="Em Tratamento">💚 Em Tratamento</SelectItem>
                    <SelectItem value="Recuperação">⚡ Recuperação</SelectItem>
                    <SelectItem value="Concluído">✅ Concluído</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue placeholder="Filtrar por condição" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🏷️ Todas as Condições</SelectItem>
                    {uniqueConditions.map((condition) => (
                      <SelectItem key={String(condition)} value={String(condition)}>
                        {String(condition)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Indicador de filtros ativos */}
              {(statusFilter !== 'all' || conditionFilter !== 'all' || searchTerm) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{filteredPatients.length} paciente(s) encontrado(s)</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setConditionFilter('all');
                    }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
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
          <div className="grid gap-4 animate-fade-in">
            {filteredPatients.map((patient, index) => (
              <Card 
                key={patient.id} 
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Avatar className="h-14 w-14 ring-2 ring-primary/20 shrink-0">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg font-semibold">
                          {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl mb-1">{patient.name}</CardTitle>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            👤 {getPatientAge(new Date(patient.birthDate))} anos
                          </span>
                          <span>•</span>
                          <span>{patient.gender}</span>
                          {patient.mainCondition && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-foreground">
                                {patient.mainCondition}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(patient.status)}>
                      {patient.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Contact Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {patient.email && (
                      <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm truncate">{patient.email}</span>
                      </div>
                    )}
                    {patient.phone && (
                      <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4 text-foreground" />
                        </div>
                        <span className="text-sm">{patient.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso do Tratamento</span>
                      <span className="font-bold text-primary">{patient.progress}%</span>
                    </div>
                    <div className="h-3 bg-accent rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                        style={{ width: `${patient.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      variant="default" 
                      size="sm"
                      className="flex-1 shadow-md hover:shadow-lg transition-all"
                      onClick={() => setViewingPatient(patient.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
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