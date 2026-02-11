/**
 * Patient Profile Page - Migrated to Firebase
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery } from '@tanstack/react-query';
import { PatientHelpers, Patient } from '@/types';
import { db, collection, query, where, getDocs, orderBy, limit } from '@/integrations/firebase/app';
import { PatientDashboard360 } from '@/components/patient/dashboard/PatientDashboard360';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {

    ArrowLeft,
    Edit,
    Calendar as CalendarIcon,
    Phone,
    Mail,
    MapPin,
    FileText,
    Activity,
    DollarSign,
    Trophy,
    Files,
    Award,
    Trash,
    Download,
    CreditCard,
    File as FileIcon,
    Brain,
    ClipboardList,
    Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseResponseDate } from '@/utils/dateUtils';

import EditPatientModal from '@/components/modals/EditPatientModal';

// Gamification Imports
import GamificationHeader from '@/components/gamification/GamificationHeader';
import StreakCalendar from '@/components/gamification/StreakCalendar';
import LevelJourneyMap from '@/components/gamification/LevelJourneyMap';
import { Leaderboard } from '@/components/gamification/Leaderboard';
import { RewardShop } from '@/components/gamification/RewardShop';
import { useGamification } from '@/hooks/useGamification';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Overview & Clinical History Imports
import { PatientEvolutionDashboard } from '@/components/patients/PatientEvolutionDashboard';
import { ProgressAnalysisCard } from '@/components/patients/ProgressAnalysisCard';
import { usePatientEvolutionReport } from '@/hooks/usePatientEvolutionReport';
import { SessionHistoryPanel } from '@/components/session/SessionHistoryPanel';

// Analytics & ML Imports
import { PatientAnalyticsDashboard, PatientLifecycleChart, PatientInsightsPanel, AIAssistantPanel } from '@/components/patients/analytics';
import { usePatientLifecycleSummary } from '@/hooks/usePatientAnalytics';
import { PatientAIChat } from '@/components/ai/PatientAIChat';
import { PatientSmartSummary } from '@/components/ai/PatientSmartSummary';
import { DoctorReferralReportGenerator } from '@/components/reports/DoctorReferralReportGenerator';

// Evolution Cards
import { MedicalReturnCard } from '@/components/evolution/MedicalReturnCard';
import { SurgeriesCard } from '@/components/evolution/SurgeriesCard';
import { MetasCard } from '@/components/evolution/MetasCard';
import { useQueryClient } from '@tanstack/react-query';

// Financial & Documents Imports
import { usePatientDocuments, useUploadDocument, useDeleteDocument, useDownloadDocument, type PatientDocument } from '@/hooks/usePatientDocuments';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEvaluationForms } from '@/hooks/useEvaluationForms';
import { PatientServiceV2 } from '@/services/patientServiceV2';
import { DocumentScanner } from '@/components/patient/DocumentScanner';

const PersonalDataTab = ({ patient }: { patient: Patient }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    Contato
                </h3>
                <div className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-muted-foreground block">Telefone</span>
                            <span className="font-medium">{patient.phone || '-'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block">Email</span>
                            <span className="font-medium truncate block" title={patient.email}>{patient.email || '-'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block">Contato de Emergência</span>
                            <span className="font-medium">{patient.emergency_contact || '-'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block">Tel. Emergência</span>
                            <span className="font-medium">{patient.emergency_phone || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    Endereço
                </h3>
                <div className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="space-y-2">
                        <div>
                            <span className="text-xs text-muted-foreground block">Logradouro</span>
                            <span className="font-medium">{patient.address || '-'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-muted-foreground block">Cidade/UF</span>
                                <span className="font-medium">
                                    {patient.city || '-'} {patient.state ? `/ ${patient.state}` : ''}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">CEP</span>
                                <span className="font-medium">{patient.zip_code || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    Saúde e Convênio
                </h3>
                <div className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-muted-foreground block">Convênio</span>
                            <span className="font-medium">{patient.health_insurance || 'Particular'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block">Número da Carteirinha</span>
                            <span className="font-medium">{patient.insurance_number || '-'}</span>
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                            <span className="text-xs text-muted-foreground block">CPF</span>
                            <span className="font-medium">{patient.cpf || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    Observações
                </h3>
                <div className="bg-card border rounded-lg p-4 space-y-3 shadow-sm min-h-[120px]">
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {patient.observations || 'Nenhuma observação registrada.'}
                    </p>
                </div>
            </div>
        </div>
    </div>
);

const OverviewTab = ({ patient }: { patient: Patient }) => {
    const { data: evolutionData } = usePatientEvolutionReport(patient.id);
    const queryClient = useQueryClient();

    // Fetch upcoming appointments
    const { data: upcomingAppointments } = useQuery({
        queryKey: ['upcoming-appointments', patient.id],
        queryFn: async () => {
            const q = query(
                collection(db, 'appointments'),
                where('patient_id', '==', patient.id),
                where('status', 'in', ['agendado', 'confirmado']),
                where('appointment_date', '>=', new Date().toISOString().split('T')[0]),
                orderBy('appointment_date', 'asc'),
                orderBy('appointment_time', 'asc'),
                limit(5)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
        },
        enabled: !!patient.id,
    });

    return (
        <div className="space-y-6">
            <PatientDashboard360
                patient={{
                    id: patient.id,
                    full_name: patient.full_name || patient.name,
                    email: patient.email || undefined,
                    phone: patient.phone || undefined,
                    birth_date: patient.birth_date || patient.birthDate,
                    address: patient.address || undefined,
                    city: patient.city || undefined,
                    state: patient.state || undefined,
                    gender: patient.gender,
                    status: patient.status
                }}
                upcomingAppointments={Array.isArray(upcomingAppointments) ? upcomingAppointments : []}
                onAction={() => { }}
            />

            {/* Evolution Management Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MedicalReturnCard
                    patient={patient}
                    patientId={patient.id}
                    onPatientUpdated={() => queryClient.invalidateQueries({ queryKey: ['patient', patient.id] })}
                />
                <SurgeriesCard patientId={patient.id} />
            </div>

            <MetasCard patientId={patient.id} />

            {/* Evolution charts below */}
            {evolutionData && evolutionData.sessions.length > 0 && (
                <>
                    <ProgressAnalysisCard sessions={evolutionData.sessions} />
                    <PatientEvolutionDashboard
                        patientId={patient.id}
                        patientName={patient.full_name || patient.name}
                        sessions={evolutionData.sessions}
                        currentPainLevel={evolutionData.currentPainLevel}
                        initialPainLevel={evolutionData.initialPainLevel}
                        totalSessions={evolutionData.totalSessions}
                        averageImprovement={evolutionData.averageImprovement}
                    />
                </>
            )}
        </div>
    );
};

import { useSoapRecordsV2 } from '@/hooks/useSoapRecordsV2';
import { normalizeFirestoreData } from '@/utils/firestoreData';

// ... (imports)

const ClinicalHistoryTab = ({ patientId }: { patientId: string }) => {
    const { data: records = [] } = useSoapRecordsV2(patientId);

    // Adapt records to SessionData interface
    const sessions = records.map(record => ({
        id: record.id,
        session_date: record.recordDate,
        subjective: record.subjective,
        objective: record.objective,
        assessment: record.assessment,
        plan: record.plan,
        created_at: record.createdAt,
        // Optional fields
        pain_level_after: 0, // V2 SOAP doesn't have pain level in core yet, separate record
    }));

    return (
        <div className="h-[600px]">
            <SessionHistoryPanel
                sessions={sessions}
                onReplicate={() => { }} // No-op for readonly view
            />
        </div>
    );
};

const FinancialTab = ({ patientId }: { patientId: string }) => {
    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ['patient-transactions', patientId],
        queryFn: async () => {
            const q = query(
                collection(db, 'appointments'),
                where('patient_id', '==', patientId),
                orderBy('appointment_date', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
        },
        enabled: !!patientId
    });

    // Calculate totals
    const totalPaid = transactions
        .filter((t: { payment_status?: string }) => t.payment_status === 'paid_single' || t.payment_status === 'paid_package')
        .reduce((sum: number, t: { payment_amount?: string | number }) => sum + (Number(t.payment_amount) || 0), 0);

    const totalPending = transactions
        .filter((t: { payment_status?: string }) => t.payment_status === 'pending')
        .reduce((sum: number, t: { payment_amount?: string | number }) => sum + (Number(t.payment_amount) || 0), 0);

    if (isLoading) {
        return <div className="p-8 text-center"><Skeleton className="h-40 w-full mx-auto" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-green-500 rounded-lg">
                                <DollarSign className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-green-700">Total Pago</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">
                            R$ {totalPaid.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-amber-500 rounded-lg">
                                <CreditCard className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-amber-700">Pendente</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-700">
                            R$ {totalPending.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <CalendarIcon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-blue-700">Total Sessões</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">
                            {transactions.length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                    {transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma transação registrada</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {transactions.map((tx: {
                                id: string;
                                appointment_date: string;
                                payment_status: string;
                                payment_method?: string;
                                type?: string;
                                installments?: number;
                                payment_amount?: string | number;
                            }) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            p-2 rounded-lg ${tx.payment_status === 'paid_single' || tx.payment_status === 'paid_package'
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-amber-100 text-amber-600'
                                            }
                                        `}>
                                            <CreditCard className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {format(parseResponseDate(tx.appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {tx.type} • {tx.payment_method || 'Pendente'}
                                                {tx.installments > 1 && ` • ${tx.installments}x`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">
                                            R$ {Number(tx.payment_amount || 0).toFixed(2)}
                                        </p>
                                        <Badge
                                            variant={tx.payment_status === 'pending' ? 'secondary' : 'default'}
                                            className="text-xs"
                                        >
                                            {tx.payment_status === 'paid_single' || tx.payment_status === 'paid_package'
                                                ? 'Pago'
                                                : 'Pendente'}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const DocumentsTab = ({ patientId }: { patientId: string }) => {
    const { data: documents, isLoading } = usePatientDocuments(patientId);
    const uploadDocument = useUploadDocument();
    const deleteDocument = useDeleteDocument();
    const downloadDocument = useDownloadDocument();
    const [uploading, setUploading] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<PatientDocument['category']>('outro');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadDialogOpen(true);
        }
    };

    const handleUploadConfirm = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            await uploadDocument.mutateAsync({
                patient_id: patientId,
                file: selectedFile,
                category: selectedCategory,
                description: description || undefined,
            });
            setUploadDialogOpen(false);
            setSelectedFile(null);
            setSelectedCategory('outro');
            setDescription('');
        } finally {
            setUploading(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center"><Skeleton className="h-40 w-full mx-auto" /></div>;
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const categoryLabels: Record<PatientDocument['category'], string> = {
        laudo: 'Laudo',
        exame: 'Exame',
        receita: 'Receita',
        termo: 'Termo',
        outro: 'Outro'
    };

    return (
        <div className="space-y-4">
            <DocumentScanner onScanComplete={(text) => alert('Texto extraído: ' + text.substring(0, 100) + '...')} />
            <Card className="border-dashed border-2">
                <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center">
                        <Files className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                            Arraste arquivos aqui ou clique para selecionar
                        </p>
                        <input
                            type="file"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="hidden"
                            id="file-upload"
                        />
                        <Label htmlFor="file-upload">
                            <Button variant="outline" disabled={uploading} asChild>
                                <span className="cursor-pointer">
                                    {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
                                </span>
                            </Button>
                        </Label>
                    </div>
                </CardContent>
            </Card>

            {documents && documents.length > 0 ? (
                <div className="space-y-2">
                    {documents.map((doc: PatientDocument) => (
                        <Card key={doc.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <FileIcon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{doc.file_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatFileSize(doc.file_size)} • {categoryLabels[doc.category]} • {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                        {doc.description && (
                                            <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => downloadDocument.mutate(doc)}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteDocument.mutate(doc)}
                                    >
                                        <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Files className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">Nenhum arquivo anexado</p>
                    </CardContent>
                </Card>
            )}

            {/* Upload Category Dialog */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Categorizar Documento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Arquivo selecionado</Label>
                            <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as PatientDocument['category'])}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="laudo">Laudo</SelectItem>
                                    <SelectItem value="exame">Exame</SelectItem>
                                    <SelectItem value="receita">Receita</SelectItem>
                                    <SelectItem value="termo">Termo</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição (opcional)</Label>
                            <Input
                                id="description"
                                placeholder="Adicione uma descrição para o documento..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleUploadConfirm} disabled={uploading}>
                            {uploading ? 'Enviando...' : 'Enviar'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ============================================================================
// ANALYTICS TAB WITH ML PREDICTIONS
// ============================================================================

const AnalyticsTab = ({ patientId, patientName, birthDate, condition }: { patientId: string; patientName: string; birthDate?: string; condition: string }) => {
    const { data: lifecycleSummary, isLoading: lifecycleLoading } = usePatientLifecycleSummary(patientId);
    const { data: records = [] } = useSoapRecordsV2(patientId);

    // Adapt records for smart summary
    const summaryHistory = records.map(r => ({
        date: r.recordDate,
        subjective: r.subjective,
        objective: r.objective,
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {/* New Smart Patient Summary - High Visibility */}
                    <PatientSmartSummary
                        patientId={patientId}
                        patientName={patientName}
                        condition={condition}
                        history={summaryHistory}
                    />
                </div>
                <div className="lg:col-span-1">
                    {/* Professional PDF Generator */}
                    <DoctorReferralReportGenerator
                        patientId={patientId}
                        patientName={patientName}
                        birthDate={birthDate}
                        condition={condition}
                    />
                </div>
            </div>

            {/* Main Analytics Dashboard */}
            <PatientAnalyticsDashboard patientId={patientId} patientName={patientName} />

            {/* AI Assistant Panel - Full Width */}
            <AIAssistantPanel patientId={patientId} patientName={patientName} />

            {/* Google Gemini Chat - New */}
            <PatientAIChat patientId={patientId} patientName={patientName} />

            {/* Two-column layout for lifecycle and insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lifecycle Chart */}
                <PatientLifecycleChart
                    summary={lifecycleSummary || null}
                    isLoading={lifecycleLoading}
                />

                {/* Insights Panel */}
                <PatientInsightsPanel patientId={patientId} limit={5} showHeader={true} />
            </div>
        </div>
    );
};

const GamificationTab = ({ patientId }: { patientId: string }) => {
    const {
        profile,
        xpPerLevel,
        currentXp,
        streak
    } = useGamification(patientId);

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/10 border-dashed">
                <Trophy className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Gamificação não iniciada para este paciente</p>
                <Button variant="outline" size="sm" className="mt-4">Iniciar Gamificação</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <GamificationHeader
                level={profile.level}
                currentXp={currentXp}
                xpPerLevel={xpPerLevel}
                streak={streak}
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    {/* Recompensas Ativas */}
                    <div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Gift className="w-5 h-5 text-primary" />
                            Loja de Vantagens
                        </h3>
                        <RewardShop />
                    </div>

                    {/* Mapa de Jornada */}
                    <LevelJourneyMap currentLevel={profile.level} />
                </div>

                <div className="space-y-8">
                    {/* Ranking Social */}
                    <Leaderboard />

                    {/* Calendário de Frequência */}
                    <StreakCalendar
                        todayActivity={false} // Would need real activity check
                        activeDates={profile.last_activity_date ? [profile.last_activity_date] : []}
                    />
                </div>
            </div>
        </div>
    );
};

export const PatientProfilePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const { data: patient, isLoading } = useQuery({
        queryKey: ['patient', id],
        queryFn: async () => {
            if (!id) return null;
            // Migrated to V2 API (Postgres)
            const response = await PatientServiceV2.get(id);
            return response.data;
        },
        enabled: !!id
    });

    const [editingPatient, setEditingPatient] = useState<boolean>(false);
    const [evaluationModalOpen, setEvaluationModalOpen] = useState<boolean>(false);
    const [_selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

    // Valid tab values
    const validTabs = ['overview', 'analytics', 'personal', 'clinical', 'financial', 'gamification', 'documents'] as const;
    type TabValue = typeof validTabs[number];

    // Get initial tab from URL or default to 'overview'
    const [activeTab, setActiveTab] = useState<TabValue>(() => {
        const tabFromUrl = searchParams.get('tab');
        return (tabFromUrl && validTabs.includes(tabFromUrl as TabValue)) ? tabFromUrl as TabValue : 'overview';
    });

    // Fetch evaluation forms for the modal
    const { data: evaluationForms = [] } = useEvaluationForms();

    // Auto-open edit modal if patient has incomplete registration
    useEffect(() => {
        if (patient && patient.incomplete_registration) {
            setEditingPatient(true);
        }
    }, [patient]);

    const handleStartEvaluation = () => {
        setEvaluationModalOpen(true);
    };

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplate(templateId);
        setEvaluationModalOpen(false);
        // Navigate to new evaluation page with selected template
        navigate(`/patients/${id}/evaluations/new/${templateId}`);
    };

    if (isLoading) {
        return (
            <MainLayout>
                <LoadingSkeleton type="card" rows={4} />
            </MainLayout>
        );
    }

    if (!patient) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                    <h2 className="text-2xl font-bold">Paciente não encontrado</h2>
                    <Button onClick={() => navigate('/patients')}>Voltar para lista</Button>
                </div>
            </MainLayout>
        );
    }

    const patientName = PatientHelpers.getName(patient);
    const initials = patientName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <MainLayout>
            <div className="space-y-6 pb-20 fade-in relative">
                {/* Header Navigation */}
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/patients')} className="-ml-2 hover:bg-transparent hover:text-primary">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-medium hover:text-primary cursor-pointer" onClick={() => navigate('/patients')}>Voltar para Pacientes</span>
                </div>

                {/* Patient Header Card - Enhanced */}
                <div className="bg-gradient-to-r from-card to-card/50 rounded-xl p-6 shadow-sm border space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                                    <AvatarImage src={patient.photo_url} className="object-cover" />
                                    <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-background ${patient.status === 'active' || patient.status === 'Em Tratamento' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            </div>

                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">{patientName}</h1>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Badge variant={patient.status === 'Em Tratamento' || patient.status === 'active' ? 'default' : 'secondary'} className="px-3 py-1">
                                        {patient.status || 'Status desconhecido'}
                                    </Badge>
                                    {patient.birth_date && (
                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                                            <CalendarIcon className="h-3.5 w-3.5" />
                                            {format(new Date(patient.birth_date), 'dd/MM/yyyy')}
                                            <span className="text-muted-foreground/50">|</span>
                                            {Math.floor((new Date().getTime() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} anos
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            <Button onClick={() => navigate(`/patients/${id}/evolution/report`)} variant="outline" className="flex-1 md:flex-none gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors">
                                <FileText className="h-4 w-4" />
                                Relatório
                            </Button>
                            <Button onClick={() => setEditingPatient(true)} variant="outline" className="flex-1 md:flex-none gap-2 hover:bg-muted/80">
                                <Edit className="h-4 w-4" />
                                Editar
                            </Button>
                            <Button onClick={handleStartEvaluation} className="flex-1 md:flex-none gap-2 bg-primary shadow-sm hover:shadow-md transition-all">
                                <ClipboardList className="h-4 w-4" />
                                Avaliar
                            </Button>
                            <Button onClick={() => navigate('/schedule')} className="flex-1 md:flex-none gap-2 bg-primary/90 hover:bg-primary shadow-sm">
                                <CalendarIcon className="h-4 w-4" />
                                Agendar
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-border/50">
                        <div className="flex items-center gap-3 text-sm p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="p-2.5 bg-primary/10 rounded-full text-primary shrink-0">
                                <Phone className="h-4 w-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-muted-foreground text-xs font-medium mb-0.5">Telefone</p>
                                <p className="font-medium truncate">{patient.phone || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="p-2.5 bg-primary/10 rounded-full text-primary shrink-0">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-muted-foreground text-xs font-medium mb-0.5">Email</p>
                                <p className="font-medium truncate" title={patient.email}>
                                    {patient.email || 'Não informado'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm p-3 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="p-2.5 bg-primary/10 rounded-full text-primary shrink-0">
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-muted-foreground text-xs font-medium mb-0.5">Localização</p>
                                <p className="font-medium truncate">{patient.city ? `${patient.city}/${patient.state || ''}` : 'Não informado'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Tabs - Sticky */}
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
                    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-2 pt-2 -mx-4 px-4 border-b">
                        <TabsList className="w-full justify-start h-auto p-1 bg-transparent overflow-x-auto flex-nowrap scrollbar-hide gap-2">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 text-sm font-medium transition-all">
                                Visão Geral
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 text-sm font-medium gap-2 transition-all">
                                <Brain className="h-3.5 w-3.5" />
                                Analytics & IA
                            </TabsTrigger>
                            <TabsTrigger value="personal" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 text-sm font-medium transition-all">
                                Dados Pessoais
                            </TabsTrigger>
                            <TabsTrigger value="clinical" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 text-sm font-medium transition-all">
                                Histórico Clínico
                            </TabsTrigger>
                            <TabsTrigger value="financial" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 text-sm font-medium transition-all">
                                Financeiro
                            </TabsTrigger>
                            <TabsTrigger value="gamification" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 text-sm font-medium transition-all">
                                Gamificação
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 text-sm font-medium transition-all">
                                Arquivos
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="mt-6 min-h-[500px]">
                        <TabsContent value="overview" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                            <OverviewTab patient={patient} />
                        </TabsContent>

                        <TabsContent value="analytics" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                            <AnalyticsTab 
                                patientId={id || ''} 
                                patientName={patientName} 
                                birthDate={patient.birth_date}
                                condition={patient.main_condition || 'Não informada'} 
                            />
                        </TabsContent>

                        <TabsContent value="personal" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                            <PersonalDataTab patient={patient} />
                        </TabsContent>

                        <TabsContent value="clinical" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                            <ClinicalHistoryTab patientId={id || ''} />
                        </TabsContent>

                        <TabsContent value="financial" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                            <FinancialTab patientId={id || ''} />
                        </TabsContent>

                        <TabsContent value="gamification" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                            <GamificationTab patientId={id || ''} />
                        </TabsContent>

                        <TabsContent value="documents" className="mt-0 focus-visible:outline-none animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                            <DocumentsTab patientId={id || ''} />
                        </TabsContent>
                    </div>
                </Tabs>

                <EditPatientModal
                    open={editingPatient}
                    onOpenChange={setEditingPatient}
                    patientId={id}
                    patient={patient}
                />

                {/* Evaluation Template Selection Modal */}
                <Dialog open={evaluationModalOpen} onOpenChange={setEvaluationModalOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                </div>
                                Iniciar Nova Avaliação
                            </DialogTitle>
                            <DialogDescription>
                                Selecione um template de avaliação para {patientName}
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="max-h-[60vh] pr-4">
                            <div className="space-y-4 pt-4">
                                {evaluationForms.length === 0 ? (
                                    <div className="text-center py-8">
                                        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground">
                                            Nenhum template de avaliação disponível
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Vá em "Cadastros → Fichas de Avaliação" para criar templates
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Quick access - Favorites */}
                                        {evaluationForms.filter(f => f.is_favorite).slice(0, 3).length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                                    <Sparkles className="h-3 w-3" />
                                                    Favoritos
                                                </p>
                                                {evaluationForms
                                                    .filter(f => f.is_favorite)
                                                    .slice(0, 3)
                                                    .map((form) => (
                                                        <button
                                                            key={form.id}
                                                            onClick={() => handleSelectTemplate(form.id)}
                                                            className="w-full text-left p-3 rounded-lg border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all group"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-sm">{form.nome}</p>
                                                                    {form.descricao && (
                                                                        <p className="text-xs text-muted-foreground truncate">{form.descricao}</p>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {(form.evaluation_form_fields?.length || 0)} campos
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                            </div>
                                        )}

                                        {/* All templates */}
                                        <details className="group">
                                            <summary className="text-xs font-semibold text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground list-none p-0 bg-transparent border-none w-full">
                                                <span>Ver todos os templates</span>
                                                <span className="ml-auto group-open:rotate-90 transition-transform">›</span>
                                            </summary>
                                            <div className="mt-2 space-y-2 pl-4">
                                                {evaluationForms.map((form) => (
                                                    <button
                                                        key={form.id}
                                                        onClick={() => handleSelectTemplate(form.id)}
                                                        className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all flex items-center justify-between group"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">{form.nome}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="text-xs">
                                                                    {form.tipo}
                                                                </Badge>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {(form.evaluation_form_fields?.length || 0)} campos
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Selecionar →
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEvaluationModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={() => setEvaluationModalOpen(false)}>
                                Criar Template Novo
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
};

export default PatientProfilePage;