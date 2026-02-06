import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { db, collection, getDocs, query, getFirestore } from '@/integrations/firebase/app';
import { normalizeFirestoreData } from '@/utils/firestoreData';

export function BackupSettings() {
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
            const backupData: Record<string, unknown> = {
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: '3.0'
                }
            };

            // Fetch critical collections
            const collections = [
                'patients',
                'appointments',
                'transactions',
                'session_packages',
                'patient_packages'
            ];

            await Promise.all(collections.map(async (colName) => {
                const colRef = collectionRef(db, colName);
                const snapshot = await getDocsFromCollection(colRef);
                backupData[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
            }));

            // Create Blob
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Trigger Download
            const link = document.createElement('a');
            link.href = url;
            link.download = `fisioflow_backup_${timestamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "Backup concluído",
                description: "O arquivo de dados foi baixado com sucesso."
            });

        } catch (error) {
            logger.error('Backup failed', error, 'BackupSettings');
            toast({
                title: "Erro no backup",
                description: "Falha ao exportar dados. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="border-b border-border p-3 sm:p-4">
                <CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                    <Database className="w-4 h-4 sm:w-5 sm:h-5" />
                    Backup de Dados
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Exporte seus dados para manter uma cópia de segurança local.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Exportar Dados Completos</p>
                        <p className="text-xs text-muted-foreground">
                            Inclui pacientes, agendamentos, financeiro e pacotes.
                        </p>
                    </div>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        variant="outline"
                        size="sm"
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        {isExporting ? 'Exportando...' : 'Baixar JSON'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}