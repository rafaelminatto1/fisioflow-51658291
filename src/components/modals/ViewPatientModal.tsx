import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Activity,
  Clock,
  Edit,
  AlertTriangle,
  Heart,
  Weight,
  Ruler,
  Shield,
  CreditCard,
  Briefcase,
  GraduationCap,
  Users,
  Pill,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  FileDown,
  Plus
} from 'lucide-react';
import { usePatients } from '@/hooks/usePatients';
import { usePatientDocuments } from '@/hooks/usePatientDocuments';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { TherapistAssignment } from '@/components/patients/TherapistAssignment';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ViewPatientModalProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewPatientModal({ patientId, isOpen, onClose }: ViewPatientModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const { getPatient } = usePatients();
  const { documents, loading: documentsLoading, refetch: refetchDocuments } = usePatientDocuments(patientId);

  const patient = getPatient(patientId);

  if (!patient) {
    return null;
  }

  const getPatientAge = (birthDate: Date) => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em Tratamento':
        return 'bg-green-100 text-green-800';
      case 'Recuperação':
        return 'bg-yellow-100 text-yellow-800';
      case 'Inicial':
        return 'bg-blue-100 text-blue-800';
      case 'Concluído':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const calculateBMI = () => {
    if (patient.weight && patient.height) {
      const heightInMeters = patient.height / 100;
      const bmi = patient.weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Abaixo do peso', color: 'text-blue-600' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { label: 'Sobrepeso', color: 'text-yellow-600' };
    return { label: 'Obesidade', color: 'text-red-600' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground">
              Perfil do Paciente
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileDown className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold">
                    {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-3xl font-bold text-foreground">{patient.name}</h2>
                    <Badge className={getStatusColor(patient.status)}>
                      {patient.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {getPatientAge(patient.birthDate)} anos
                    </span>
                    <span>•</span>
                    <span>{patient.gender}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      {patient.mainCondition}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Progresso:</span>
                      <span className="text-sm font-medium">{patient.progress}%</span>
                    </div>
                    <div className="w-48 bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${patient.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="health">Saúde</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
              <TabsTrigger value="assignments">Responsáveis</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Contact and Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Informações Pessoais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {patient.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{patient.email}</p>
                        </div>
                      </div>
                    )}
                    {patient.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Telefone</p>
                          <p className="font-medium">{patient.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                        <p className="font-medium">
                          {format(patient.birthDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {patient.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm text-muted-foreground">Endereço</p>
                          <p className="font-medium">{patient.address}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Informações Profissionais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {patient.profession && (
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Profissão</p>
                          <p className="font-medium">{patient.profession}</p>
                        </div>
                      </div>
                    )}
                    {patient.educationLevel && (
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Escolaridade</p>
                          <p className="font-medium">{patient.educationLevel}</p>
                        </div>
                      </div>
                    )}
                    {patient.maritalStatus && (
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Estado Civil</p>
                          <p className="font-medium">{patient.maritalStatus}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Emergency Contact and Insurance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(patient.emergencyContact || patient.emergencyContactRelationship) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Contato de Emergência
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {patient.emergencyContact && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Telefone</p>
                            <p className="font-medium">{patient.emergencyContact}</p>
                          </div>
                        </div>
                      )}
                      {patient.emergencyContactRelationship && (
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Parentesco</p>
                            <p className="font-medium">{patient.emergencyContactRelationship}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {(patient.insurancePlan || patient.insuranceNumber) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Convênio Médico
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {patient.insurancePlan && (
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Plano</p>
                            <p className="font-medium">{patient.insurancePlan}</p>
                          </div>
                        </div>
                      )}
                      {patient.insuranceNumber && (
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Número</p>
                            <p className="font-medium">{patient.insuranceNumber}</p>
                          </div>
                        </div>
                      )}
                      {patient.insuranceValidity && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Validade</p>
                            <p className="font-medium">
                              {format(patient.insuranceValidity, "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="health" className="space-y-6">
              {/* Physical Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Informações Físicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {patient.bloodType && (
                      <div className="flex items-center gap-3">
                        <Heart className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Tipo Sanguíneo</p>
                          <p className="font-medium">{patient.bloodType}</p>
                        </div>
                      </div>
                    )}
                    {patient.weight && (
                      <div className="flex items-center gap-3">
                        <Weight className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Peso</p>
                          <p className="font-medium">{patient.weight} kg</p>
                        </div>
                      </div>
                    )}
                    {patient.height && (
                      <div className="flex items-center gap-3">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Altura</p>
                          <p className="font-medium">{patient.height} cm</p>
                        </div>
                      </div>
                    )}
                    {calculateBMI() && (
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">IMC</p>
                          <p className="font-medium">
                            {calculateBMI()} - 
                            <span className={`ml-1 ${getBMICategory(parseFloat(calculateBMI()!)).color}`}>
                              {getBMICategory(parseFloat(calculateBMI()!)).label}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Condição Principal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <p className="font-medium text-primary text-lg">{patient.mainCondition}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Medical History and Medications */}
              <div className="space-y-4">
                {patient.medicalHistory && (
                  <Card>
                    <CardHeader>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0"
                        onClick={() => toggleSection('medical-history')}
                      >
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Histórico Médico
                        </CardTitle>
                        {expandedSections['medical-history'] ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                        }
                      </Button>
                    </CardHeader>
                    {expandedSections['medical-history'] && (
                      <CardContent>
                        <p className="text-sm bg-muted/50 p-4 rounded-lg leading-relaxed">
                          {patient.medicalHistory}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                )}

                {patient.allergies && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        Alergias
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                        <p className="text-sm text-orange-800">{patient.allergies}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {patient.medications && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Pill className="w-5 h-5" />
                        Medicações Atuais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                        <p className="text-sm text-blue-800">{patient.medications}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documentos do Paciente
                    </CardTitle>
                    <DocumentUpload
                      patientId={patientId}
                      onUploadComplete={refetchDocuments}
                      trigger={
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar
                        </Button>
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {documentsLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Carregando documentos...</p>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Nenhum documento encontrado</p>
                      <p className="text-sm text-muted-foreground">
                        Adicione documentos como identidade, exames, laudos médicos, etc.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(doc.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{doc.type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assignments" className="space-y-6">
              <TherapistAssignment patientId={patientId} patientName={patient.name} />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Histórico de Atividades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div>
                        <p className="font-medium">Paciente criado</p>
                        <p className="text-sm text-muted-foreground">
                          {format(patient.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    
                    {patient.updatedAt.getTime() !== patient.createdAt.getTime() && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">Última atualização</p>
                          <p className="text-sm text-muted-foreground">
                            {format(patient.updatedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-center py-8">
                      <p className="text-muted-foreground text-sm">
                        Histórico completo de consultas, evolução e tratamentos em breve.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}