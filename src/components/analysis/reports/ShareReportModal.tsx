import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Stethoscope, MessageCircle, Copy, Check, Download } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ClinicalReportPDF from './ClinicalReportPDF';
import { generateWhatsAppText, generateDoctorLetterText, logExportEvent } from '@/services/report/reportExportService';
import { AIAnalysisResult } from '@/services/ai/clinicalAnalysisService';

interface ShareReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: AIAnalysisResult;
    patientName: string;
    professionalName?: string;
}

const ShareReportModal: React.FC<ShareReportModalProps> = ({ isOpen, onClose, report, patientName, professionalName = "Fisioterapeuta" }) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    // Generated Texts
    const whatsappText = generateWhatsAppText(patientName, report.patient_summary);
    const doctorText = generateDoctorLetterText(
        patientName,
        professionalName,
        report.key_findings.map(k => k.text),
        "Melhora significativa" // Mock evolution logic access
    );

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast({ title: "Copiado!", description: "Texto pronto para colar." });
        setTimeout(() => setCopied(false), 2000);

        logExportEvent({
            format: 'whatsapp',
            recipientType: 'patient',
            patientName,
            professionalName
        });
    };

    const handleDownloadAudit = () => {
        logExportEvent({
            format: 'pdf',
            recipientType: 'patient',
            patientName,
            professionalName
        });
        // Close after a slight delay to allow download to start
        setTimeout(onClose, 1000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Exportar e Compartilhar</DialogTitle>
                    <DialogDescription>Selecione o formato e o destinatário do relatório.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="pdf" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="pdf" className="flex gap-2"><FileText className="w-4 h-4" /> PDF Clínico</TabsTrigger>
                        <TabsTrigger value="doctor" className="flex gap-2"><Stethoscope className="w-4 h-4" /> Carta ao Médico</TabsTrigger>
                        <TabsTrigger value="whatsapp" className="flex gap-2"><MessageCircle className="w-4 h-4" /> WhatsApp</TabsTrigger>
                    </TabsList>

                    {/* PDF Tab */}
                    <TabsContent value="pdf" className="space-y-4 py-4">
                        <div className="bg-slate-100 p-4 rounded text-sm text-slate-600">
                            <p className="mb-2"><strong>Conteúdo:</strong> Relatório completo com dados técnicos, resumo ao paciente, gráficos e exercícios.</p>
                            <p><strong>Ideal para:</strong> Registro em prontuário, impressão ou envio por e-mail.</p>
                        </div>
                        <div className="flex justify-end">
                            <PDFDownloadLink
                                document={
                                    <ClinicalReportPDF
                                        report={report}
                                        patientName={patientName}
                                        professionalName={professionalName}
                                        date={new Date().toLocaleDateString('pt-BR')}
                                    />
                                }
                                fileName={`Relatorio_Clinico_${patientName.replace(/\s+/g, '_')}.pdf`}
                            >
                                {({ loading }) => (
                                    <Button disabled={loading} onClick={handleDownloadAudit} className="gap-2">
                                        {loading ? 'Gerando PDF...' : <><Download className="w-4 h-4" /> Baixar PDF Completo</>}
                                    </Button>
                                )}
                            </PDFDownloadLink>
                        </div>
                    </TabsContent>

                    {/* Doctor Letter Tab */}
                    <TabsContent value="doctor" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Pré-visualização da Carta</label>
                            <Textarea value={doctorText} readOnly className="h-48 font-mono text-sm bg-slate-50" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => handleCopy(doctorText)}>
                                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                Copiar Texto
                            </Button>
                            {/* Future: Generate PDF specifically for doctor */}
                        </div>
                    </TabsContent>

                    {/* WhatsApp Tab */}
                    <TabsContent value="whatsapp" className="space-y-4 py-4">
                        <div className="bg-green-50 p-3 rounded border border-green-200 text-green-800 text-sm mb-2">
                            Atenção: A FisioFlow não envia mensagens automaticamente. Copie o texto abaixo e cole no seu WhatsApp.
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Texto Sugerido</label>
                            <Textarea value={whatsappText} readOnly className="h-32 font-mono text-sm" />
                        </div>
                        <div className="flex justify-end">
                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCopy(whatsappText)}>
                                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                Copiar para WhatsApp
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default ShareReportModal;
