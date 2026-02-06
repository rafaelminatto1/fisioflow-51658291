import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSearch, Camera, Save, User } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { usePatientsPostgres } from '@/hooks/useDataConnect';

export default function DocumentScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  // Buscar pacientes para vincular o exame
  const { data: patients } = usePatientsPostgres('default');

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);

    try {
      // 1. Upload
      const storageRef = ref(storage, `medical_reports/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // 2. Chamar Cloud Vision/OCR Function
      const scanMedicalReport = httpsCallable(functions, 'scanMedicalReportHttp');
      const result = await scanMedicalReport({ fileUrl });

      setExtractedData({ ...result.data as any, fileUrl });
      toast({ title: "Sucesso", description: "Dados extraídos do documento." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível ler o documento.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToRecord = async () => {
    if (!selectedPatient || !extractedData) return;
    setSaving(true);

    try {
      // Salvar como registro médico
      const createRecord = httpsCallable(functions, 'createMedicalRecordV2');
      await createRecord({
        patientId: selectedPatient,
        type: 'exam_result',
        description: `Exame digitalizado via OCR. \n\nTexto extraído: ${(extractedData.text || '').substring(0, 500)}...`,
        attachments: [extractedData.fileUrl],
        date: new Date().toISOString()
      });

      toast({ title: "Salvo!", description: "Documento anexado ao prontuário do paciente." });
      setExtractedData(null);
      setFile(null);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao salvar", description: "Falha ao vincular exame.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-3 bg-green-100 rounded-lg">
          <FileSearch className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Digitalizador de Laudos</h1>
          <p className="text-gray-500">Cloud Vision OCR: Transforme papel em dados clínicos pesquisáveis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Painel de Controle */}
        <Card className="md:col-span-1">
          <CardHeader>
             <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">1. Selecione o Arquivo</label>
              <Input 
                type="file" 
                accept="application/pdf,image/*" 
                onChange={(e) => e.target.files && setFile(e.target.files[0])} 
              />
            </div>

            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleScan}
              disabled={!file || loading}
            >
              {loading ? "Processando IA..." : "2. Digitalizar Laudo"}
            </Button>

            {extractedData && (
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4" /> Vincular a Paciente
                  </label>
                  <Select onValueChange={setSelectedPatient} value={selectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={handleSaveToRecord}
                  disabled={!selectedPatient || saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Salvando..." : "3. Salvar no Prontuário"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visualização de Resultados */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Dados Extraídos</CardTitle>
            <CardDescription>O Google Cloud Vision identificou o seguinte conteúdo:</CardDescription>
          </CardHeader>
          <CardContent>
            {extractedData ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-[500px] overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
                    {extractedData.text || JSON.stringify(extractedData, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 border-2 border-dashed rounded-lg">
                <Camera className="w-12 h-12 mb-2 opacity-20" />
                <p>Faça o upload de uma foto de exame ou PDF.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </MainLayout>
  );
}
