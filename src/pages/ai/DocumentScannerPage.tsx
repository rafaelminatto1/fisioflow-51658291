import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileSearch, Camera, Check } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

export default function DocumentScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

      setExtractedData(result.data);
      toast({ title: "Sucesso", description: "Dados extraídos do documento." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível ler o documento.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-3 bg-green-100 rounded-lg">
          <FileSearch className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Digitalizador de Laudos</h1>
          <p className="text-gray-500">Extraia dados de exames PDF ou fotos usando Google Cloud Vision.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
             <CardTitle>Upload de Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              type="file" 
              accept="application/pdf,image/*" 
              onChange={(e) => e.target.files && setFile(e.target.files[0])} 
            />
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleScan}
              disabled={!file || loading}
            >
              {loading ? "Processando..." : "Digitalizar Laudo"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados Extraídos</CardTitle>
          </CardHeader>
          <CardContent>
            {extractedData ? (
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto h-[400px]">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Camera className="w-10 h-10 mb-2 opacity-20" />
                <p>Nenhum dado extraído ainda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
