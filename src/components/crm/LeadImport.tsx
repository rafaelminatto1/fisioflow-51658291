import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useCallback } from 'react';
import { useImportLeads } from '@/hooks/useCRM';
import * as XLSX from 'xlsx';

interface LeadPreview {
  nome: string;
  telefone?: string;
  email?: string;
  origem?: string;
  interesse?: string;
  valid: boolean;
  errors: string[];
}

export function LeadImport() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<LeadPreview[]>([]);
  const [fileName, setFileName] = useState('');

  const importMutation = useImportLeads();

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
        
        const previews: LeadPreview[] = json.map(row => {
          const errors: string[] = [];
          const nome = row.nome || row.name || row.Nome || row.Name || '';
          
          if (!nome) errors.push('Nome é obrigatório');
          
          return {
            nome,
            telefone: row.telefone || row.phone || row.Telefone || row.Phone || '',
            email: row.email || row.Email || '',
            origem: row.origem || row.Origem || 'Importação',
            interesse: row.interesse || row.Interesse || '',
            valid: errors.length === 0,
            errors,
          };
        });
        
        setPreviewData(previews);
        setIsDialogOpen(true);
      } catch (error) {
        console.error('Error processing file:', error);
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    const validLeads = previewData.filter(l => l.valid);
    await importMutation.mutateAsync(validLeads);
    setIsDialogOpen(false);
    setPreviewData([]);
  };

  const validCount = previewData.filter(l => l.valid).length;
  const invalidCount = previewData.filter(l => !l.valid).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary">Solte o arquivo aqui...</p>
            ) : (
              <>
                <p className="text-muted-foreground">Arraste um arquivo Excel ou CSV</p>
                <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
              </>
            )}
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Formato esperado:</h4>
            <p className="text-sm text-muted-foreground">
              Colunas: <code className="bg-background px-1 rounded">nome</code> (obrigatório), 
              <code className="bg-background px-1 rounded ml-1">telefone</code>, 
              <code className="bg-background px-1 rounded ml-1">email</code>, 
              <code className="bg-background px-1 rounded ml-1">origem</code>, 
              <code className="bg-background px-1 rounded ml-1">interesse</code>
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Pré-visualização: {fileName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-4 mb-4">
            <Badge variant="default" className="bg-emerald-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {validCount} válidos
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                {invalidCount} com erros
              </Badge>
            )}
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Interesse</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((lead, index) => (
                  <TableRow key={index} className={!lead.valid ? 'bg-destructive/10' : ''}>
                    <TableCell>
                      {lead.valid ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{lead.nome || '-'}</TableCell>
                    <TableCell>{lead.telefone || '-'}</TableCell>
                    <TableCell>{lead.email || '-'}</TableCell>
                    <TableCell>{lead.origem || '-'}</TableCell>
                    <TableCell>{lead.interesse || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={validCount === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? 'Importando...' : `Importar ${validCount} leads`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
