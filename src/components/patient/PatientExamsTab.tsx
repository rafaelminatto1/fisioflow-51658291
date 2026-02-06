import React, { useState } from 'react';
import { usePatientExams } from '@/hooks/usePatientExams';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Calendar, Paperclip, X, Trash2, Microscope } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileViewer } from '@/components/common/FileViewer';

interface PatientExamsTabProps {
    patientId?: string | null;
}

const EXAM_TYPES = [
    { value: 'image', label: 'Imagem (Raio-X, RM, TC)' },
    { value: 'laboratory', label: 'Laboratorial (Sangue, Urina)' },
    { value: 'report', label: 'Laudo/Parecer' },
    { value: 'other', label: 'Outros' }
];

export const PatientExamsTab: React.FC<PatientExamsTabProps> = ({ patientId }) => {
    const { exams, isLoading, addExam, deleteExam } = usePatientExams(patientId);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        type: 'image',
        description: ''
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

        const success = await addExam(
            {
                title: formData.title,
                date: new Date(formData.date),
                type: formData.type,
                description: formData.description
            },
            selectedFiles
        );

        setIsSubmitting(false);
        if (success) {
            setIsModalOpen(false);
            setFormData({
                title: '',
                date: new Date().toISOString().split('T')[0],
                type: 'image',
                description: ''
            });
            setSelectedFiles([]);
        }
    };

    const getExamTypeLabel = (value: string | null) => {
        return EXAM_TYPES.find(t => t.value === value)?.label || 'Outros';
    };

    if (isLoading) {
        return <div className="p-4 text-center">Carregando exames...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Exames do Paciente</h3>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Exame
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Adicionar Exame</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título do Exame</Label>
                                <Input
                                    id="title"
                                    placeholder="Ex: Ressonância Magnética Joelho"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Data do Exame</Label>
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
                                    <Label htmlFor="type">Tipo</Label>
                                    <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EXAM_TYPES.map(type => (
                                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição / Laudo Resumido</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Detalhes adicionais ou resumo do resultado..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Arquivos do Exame</Label>
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

            {exams.length === 0 ? (
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <Microscope className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhum exame registrado</p>
                        <p className="text-sm">Adicione exames de imagem, laboratoriais ou outros documentos.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {exams.map((exam) => (
                        <Card key={exam.id} className="relative group hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-semibold truncate pr-6 text-primary">{exam.title}</CardTitle>
                                        <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                                            <Calendar className="w-3 h-3" />
                                            {exam.exam_date && format(new Date(exam.exam_date), "dd/MM/yyyy", { locale: ptBR })}
                                            <span className="mx-1">•</span>
                                            {getExamTypeLabel(exam.exam_type)}
                                        </CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" onClick={() => deleteExam(exam.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {exam.description && <p className="text-sm text-foreground/80 mb-4 line-clamp-2">{exam.description}</p>}

                                <FileViewer files={exam.files || []} bucketName="patient-exams" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
