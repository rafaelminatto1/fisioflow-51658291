
import React, { useState } from 'react';
import { useMedicalRequests } from '@/hooks/useMedicalRequests';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Calendar, Paperclip, X, Trash2, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { FileViewer } from '@/components/common/FileViewer';

interface MedicalRequestsTabProps {
    patientId?: string | null;
}

export const MedicalRequestsTab: React.FC<MedicalRequestsTabProps> = ({ patientId }) => {
    const { requests, isLoading, addRequest, deleteRequest } = useMedicalRequests(patientId);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        doctorName: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const success = await addRequest(
            {
                doctorName: formData.doctorName,
                date: new Date(formData.date),
                notes: formData.notes
            },
            selectedFiles
        );

        setIsSubmitting(false);
        if (success) {
            setIsModalOpen(false);
            setFormData({
                doctorName: '',
                date: new Date().toISOString().split('T')[0],
                notes: ''
            });
            setSelectedFiles([]);
        }
    };

    const getPublicUrl = (path: string) => {
        const { data } = supabase.storage.from('medical-requests').getPublicUrl(path);
        return data.publicUrl;
    };

    if (isLoading) {
        return <div className="p-4 text-center">Carregando pedidos...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Pedidos Médicos</h3>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Pedido
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Adicionar Pedido Médico</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="doctor">Nome do Médico</Label>
                                <Input
                                    id="doctor"
                                    placeholder="Dr. Nome Sobrenome"
                                    value={formData.doctorName}
                                    onChange={e => setFormData({ ...formData, doctorName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date">Data do Pedido</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        id="date"
                                        type="date"
                                        className="pl-9"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Observações</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Detalhes adicionais..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Fotos do Pedido</Label>
                                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors relative">
                                    <Input
                                        type="file"
                                        multiple
                                        accept="image/*,application/pdf"
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        onChange={handleFileChange}
                                    />
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground pointer-events-none">
                                        <Paperclip className="w-8 h-8" />
                                        <span className="text-sm">Clique ou arraste arquivos aqui</span>
                                    </div>
                                </div>
                                {selectedFiles.length > 0 && (
                                    <div className="space-y-2 mt-2">
                                        {selectedFiles.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                                                <span className="truncate max-w-[200px]">{file.name}</span>
                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFile(i)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {requests.length === 0 ? (
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhum pedido médico registrado</p>
                        <p className="text-sm">Adicione fotos e detalhes dos pedidos médicos do paciente.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {requests.map((req) => (
                        <Card key={req.id} className="relative group hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-semibold truncate pr-6 text-primary">{req.doctor_name || 'Médico não informado'}</CardTitle>
                                        <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                                            <Calendar className="w-3 h-3" />
                                            {req.request_date && format(new Date(req.request_date), "dd/MM/yyyy", { locale: ptBR })}
                                        </CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" onClick={() => deleteRequest(req.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {req.notes && <p className="text-sm text-foreground/80 mb-4 line-clamp-2">{req.notes}</p>}

                                {req.files && req.files.length > 0 ? (
                                    <FileViewer files={req.files} bucketName="medical-requests" />
                                ) : (
                                    <div className="text-xs text-muted-foreground italic">Sem arquivos anexados</div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
