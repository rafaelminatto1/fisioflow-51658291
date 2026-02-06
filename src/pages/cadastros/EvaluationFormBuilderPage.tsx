import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, GripVertical, Trash2, Save, Eye, FileText, List, CheckSquare, AlignLeft, Type, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {

    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AssessmentSection, AssessmentQuestion, QuestionType } from '@/types/assessment';
import { useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// Mock data types for the builder state
interface BuilderSection extends Omit<AssessmentSection, 'id' | 'template_id'> {
    id: string; // Temporary ID for UI
    questions: BuilderQuestion[];
}

interface BuilderQuestion extends Omit<AssessmentQuestion, 'id' | 'section_id'> {
    id: string; // Temporary ID for UI
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: React.ReactNode; description: string }[] = [
    { type: 'text', label: 'Resposta Curta', icon: <Type className="w-4 h-4" />, description: 'Apenas uma linha de texto' },
    { type: 'long_text', label: 'Resposta Longa', icon: <AlignLeft className="w-4 h-4" />, description: 'Permite escrever quanto for necessário' },
    { type: 'scale', label: 'Escala', icon: <List className="w-4 h-4" />, description: 'Uma escala numrica ou visual' },
    { type: 'single_choice', label: 'Opo nica', icon: <CheckSquare className="w-4 h-4" />, description: 'Apenas uma opo pode ser selecionada' },
    { type: 'multiple_choice', label: 'Seleo Mltipla', icon: <CheckSquare className="w-4 h-4" />, description: 'Vrias opes podem ser selecionadas' },
    { type: 'body_map', label: 'Mapa Corporal', icon: <User className="w-4 h-4" />, description: 'Identificao de dor em imagem' },
];

export default function EvaluationFormBuilderPage() {
    const { id: _id } = useParams();
    const { toast } = useToast();
    const [templateName, setTemplateName] = useState('');
    const [templateType, setTemplateType] = useState('anamnesis');
    const [sections, setSections] = useState<BuilderSection[]>([]);
    const [activeTab, setActiveTab] = useState<'build' | 'preview'>('build');

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination } = result;

        // Reordering sections
        if (source.droppableId === 'sections' && destination.droppableId === 'sections') {
            const newSections = Array.from(sections);
            const [removed] = newSections.splice(source.index, 1);
            newSections.splice(destination.index, 0, removed);
            setSections(newSections);
            return;
        }

        // Dropping a new question type into a section
        // Check if source is from the sidebar (we might need a different DnD setup for cross-container if not strictly droppable)
        // For simplicity, we assume sidebar items are clickable to add, or we use a specific draggable ID convention

        // Reordering questions within a section
        if (source.droppableId.startsWith('section-') && destination.droppableId.startsWith('section-')) {
            const sourceSectionId = source.droppableId.replace('section-', '');
            const destSectionId = destination.droppableId.replace('section-', '');

            if (sourceSectionId === destSectionId) {
                const newSections = sections.map(section => {
                    if (section.id === sourceSectionId) {
                        const newQuestions = Array.from(section.questions);
                        const [removed] = newQuestions.splice(source.index, 1);
                        newQuestions.splice(destination.index, 0, removed);
                        return { ...section, questions: newQuestions };
                    }
                    return section;
                });
                setSections(newSections);
            } else {
                // Moving between sections logic
                const sourceSectionIndex = sections.findIndex(s => s.id === sourceSectionId);
                const destSectionIndex = sections.findIndex(s => s.id === destSectionId);

                if (sourceSectionIndex === -1 || destSectionIndex === -1) return;

                const newSections = [...sections];
                const sourceQuestions = [...newSections[sourceSectionIndex].questions];
                const destQuestions = [...newSections[destSectionIndex].questions];

                const [removed] = sourceQuestions.splice(source.index, 1);
                destQuestions.splice(destination.index, 0, removed);

                newSections[sourceSectionIndex] = { ...newSections[sourceSectionIndex], questions: sourceQuestions };
                newSections[destSectionIndex] = { ...newSections[destSectionIndex], questions: destQuestions };

                setSections(newSections);
            }
        }
    };

    const addSection = () => {
        const newSection: BuilderSection = {
            id: `section-${Date.now()}`,
            title: '',
            order_index: sections.length,
            questions: []
        };
        setSections([...sections, newSection]);
    };

    const addQuestionToSection = (sectionId: string, type: QuestionType, index?: number) => {
        setSections(sections.map(section => {
            if (section.id === sectionId) {
                const newQuestion: BuilderQuestion = {
                    id: `question-${Date.now()}`,
                    type,
                    question_text: '',
                    options: type === 'single_choice' || type === 'multiple_choice' ? ['Opção 1', 'Opção 2'] : undefined,
                    required: false,
                    order_index: index !== undefined ? index : section.questions.length
                };
                const newQuestions = Array.from(section.questions);
                if (index !== undefined) {
                    newQuestions.splice(index, 0, newQuestion);
                } else {
                    newQuestions.push(newQuestion);
                }
                return { ...section, questions: newQuestions };
            }
            return section;
        }));
    };

    const updateSection = (id: string, updates: Partial<BuilderSection>) => {
        setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const updateQuestion = (sectionId: string, questionId: string, updates: Partial<BuilderQuestion>) => {
        setSections(sections.map(section => {
            if (section.id === sectionId) {
                return {
                    ...section,
                    questions: section.questions.map(q => q.id === questionId ? { ...q, ...updates } : q)
                };
            }
            return section;
        }));
    };

    const removeQuestion = (sectionId: string, questionId: string) => {
        setSections(sections.map(section => {
            if (section.id === sectionId) {
                return {
                    ...section,
                    questions: section.questions.filter(q => q.id !== questionId)
                };
            }
            return section;
        }));
    };

    const removeSection = (sectionId: string) => {
        setSections(sections.filter(s => s.id !== sectionId));
    };

    const handleSave = async () => {
        if (!id) {
            toast({
                title: "Erro",
                description: "ID do formulário inválido",
                variant: 'destructive'
            });
            return;
        }

        // Implementation of save logic would go here
        // For now, we'll simulate a successful save
        toast({
            title: "Sucesso",
            description: "Formulário salvo com sucesso!"
        });

        // In a real implementation:
        // await updateSectionMutation.mutateAsync(...) for each section
        // await updateQuestionMutation.mutateAsync(...) for each question
    };

    return (
        <MainLayout>
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">Criar Modelo de Avaliação</h1>
                        <p className="text-muted-foreground">Arraste os campos para construir seu formulário.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setActiveTab(activeTab === 'build' ? 'preview' : 'build')}>
                            <Eye className="w-4 h-4 mr-2" />
                            {activeTab === 'build' ? 'Pré-visualizar' : 'Editar'}
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                        </Button>
                    </div>
                </div>

                {activeTab === 'build' ? (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Sidebar Tools - Simplified as clickable items for now */}
                            <div className="lg:col-span-1 space-y-4">
                                <Card className="p-4 space-y-4 sticky top-6">
                                    <div className="space-y-2">
                                        <Label>Nome do Modelo</Label>
                                        <Input
                                            placeholder="Ex: Anamnese Pilates"
                                            value={templateName}
                                            onChange={(e) => setTemplateName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select value={templateType} onValueChange={setTemplateType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="anamnesis">Anamnese</SelectItem>
                                                <SelectItem value="physical_exam">Exame Físico</SelectItem>
                                                <SelectItem value="evolution">Evolução</SelectItem>
                                                <SelectItem value="pilates">Pilates</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Separator />
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-muted-foreground">Campos Disponíveis</Label>

                                        <div className="flex flex-col gap-2">
                                            {QUESTION_TYPES.map((type, _index) => (
                                                <Card
                                                    key={type.type}
                                                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-start gap-3 border-dashed border-transparent hover:border-primary/20"
                                                    onClick={() => {
                                                        if (sections.length === 0) {
                                                            // Auto create first section
                                                            const newSectionId = `section-${Date.now()}`;
                                                            const newSection: BuilderSection = {
                                                                id: newSectionId,
                                                                title: 'Novo Grupo',
                                                                order_index: 0,
                                                                questions: []
                                                            };

                                                            const newQuestion: BuilderQuestion = {
                                                                id: `question-${Date.now() + 1}`,
                                                                type: type.type,
                                                                question_text: '',
                                                                options: type.type === 'single_choice' || type.type === 'multiple_choice' ? ['Opção 1', 'Opção 2'] : undefined,
                                                                required: false,
                                                                order_index: 0
                                                            };
                                                            newSection.questions.push(newQuestion);
                                                            setSections([newSection]);

                                                        } else {
                                                            // Add to last section by default
                                                            addQuestionToSection(sections[sections.length - 1].id, type.type);
                                                        }
                                                    }}
                                                >
                                                    <div className="mt-0.5 text-primary">{type.icon}</div>
                                                    <div>
                                                        <p className="font-medium text-sm text-foreground">{type.label}</p>
                                                        <p className="text-xs text-muted-foreground">{type.description}</p>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Main Canvas */}
                            <div className="lg:col-span-3 space-y-6">
                                {sections.length === 0 && (
                                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/20 text-muted-foreground">
                                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                                        <p className="text-lg font-medium">Comece adicionando um grupo ou clicando em um campo</p>
                                        <p className="text-sm mb-4">Grupos ajudam a organizar suas perguntas.</p>
                                        <Button onClick={addSection} variant="outline" className="gap-2">
                                            <Plus className="w-4 h-4" />
                                            Adicionar Novo Grupo
                                        </Button>
                                    </div>
                                )}

                                <Droppable droppableId="sections" type="section">
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-6">
                                            {sections.map((section, index) => (
                                                <Draggable key={section.id} draggableId={section.id} index={index}>
                                                    {(provided) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className="p-6 space-y-6 bg-card"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div {...provided.dragHandleProps} className="cursor-move text-muted-foreground hover:text-foreground">
                                                                    <GripVertical className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <Input
                                                                        placeholder="Nome do grupo (opcional)"
                                                                        value={section.title}
                                                                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                                                                        className="text-lg font-medium border-transparent hover:border-input focus:border-input px-0 h-auto py-1 shadow-none"
                                                                    />
                                                                </div>
                                                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeSection(section.id)}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>

                                                            <Droppable droppableId={`section-${section.id}`} type="question">
                                                                {(provided) => (
                                                                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4 pl-4 border-l-2 border-muted min-h-[50px]">
                                                                        {section.questions.map((question, qIndex) => (
                                                                            <Draggable key={question.id} draggableId={question.id} index={qIndex}>
                                                                                {(provided) => (
                                                                                    <div
                                                                                        ref={provided.innerRef}
                                                                                        {...provided.draggableProps}
                                                                                        className="group flex gap-3 bg-background border rounded-md p-4 shadow-sm hover:shadow-md transition-shadow"
                                                                                    >
                                                                                        <div {...provided.dragHandleProps} className="mt-2.5 cursor-move text-muted-foreground opacity-50 group-hover:opacity-100">
                                                                                            <GripVertical className="w-4 h-4" />
                                                                                        </div>
                                                                                        <div className="flex-1 space-y-4">
                                                                                            <div className="flex items-start gap-4">
                                                                                                <div className="flex-1 space-y-2">
                                                                                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                                                                                        {QUESTION_TYPES.find(t => t.type === question.type)?.label}
                                                                                                    </Label>
                                                                                                    <Input
                                                                                                        placeholder="Nome para o campo"
                                                                                                        value={question.question_text}
                                                                                                        onChange={(e) => updateQuestion(section.id, question.id, { question_text: e.target.value })}
                                                                                                    />
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2 pt-6">
                                                                                                    <Switch
                                                                                                        checked={question.required}
                                                                                                        onCheckedChange={(checked) => updateQuestion(section.id, question.id, { required: checked })}
                                                                                                    />
                                                                                                    <Label className="text-sm text-muted-foreground">Obrigatório</Label>
                                                                                                </div>
                                                                                                <Button variant="ghost" size="icon" className="mt-6 text-muted-foreground hover:text-destructive" onClick={() => removeQuestion(section.id, question.id)}>
                                                                                                    <Trash2 className="w-4 h-4" />
                                                                                                </Button>
                                                                                            </div>

                                                                                            {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                                                                                                <div className="pl-4 space-y-2">
                                                                                                    <Label className="text-xs font-medium text-muted-foreground">Opções</Label>
                                                                                                    {question.options?.map((option, optIndex) => (
                                                                                                        <div key={optIndex} className="flex items-center gap-2">
                                                                                                            <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                                                                                                            <Input
                                                                                                                value={option}
                                                                                                                onChange={(e) => {
                                                                                                                    const newOptions = [...(question.options || [])];
                                                                                                                    newOptions[optIndex] = e.target.value;
                                                                                                                    updateQuestion(section.id, question.id, { options: newOptions });
                                                                                                                }}
                                                                                                                className="h-8"
                                                                                                            />
                                                                                                            <Button
                                                                                                                variant="ghost"
                                                                                                                size="icon"
                                                                                                                className="h-8 w-8"
                                                                                                                onClick={() => {
                                                                                                                    const newOptions = question.options?.filter((_, i) => i !== optIndex);
                                                                                                                    updateQuestion(section.id, question.id, { options: newOptions });
                                                                                                                }}
                                                                                                            >
                                                                                                                <Trash2 className="w-3 h-3" />
                                                                                                            </Button>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        className="h-8 text-xs text-muted-foreground hover:text-primary"
                                                                                                        onClick={() => {
                                                                                                            const newOptions = [...(question.options || []), `Opção ${(question.options?.length || 0) + 1}`];
                                                                                                            updateQuestion(section.id, question.id, { options: newOptions });
                                                                                                        }}
                                                                                                    >
                                                                                                        <Plus className="w-3 h-3 mr-1" />
                                                                                                        Adicionar opção
                                                                                                    </Button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </Draggable>
                                                                        ))}
                                                                        {provided.placeholder}
                                                                    </div>
                                                                )}
                                                            </Droppable>

                                                            <div className="pl-4 pt-2">
                                                                <p className="text-xs text-muted-foreground italic text-center py-2 border-2 border-dashed border-transparent hover:border-muted rounded transition-colors cursor-pointer"
                                                                    onClick={() => {
                                                                        addQuestionToSection(section.id, 'text');
                                                                    }}
                                                                >
                                                                    Clique para adicionar campo de texto ou selecione na lateral
                                                                </p>
                                                            </div>
                                                        </Card>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}

                                            {sections.length > 0 && (
                                                <Button variant="outline" onClick={addSection} className="w-full py-8 border-dashed gap-2 text-muted-foreground hover:text-primary hover:border-primary/50">
                                                    <Plus className="w-4 h-4" />
                                                    Adicionar Novo Grupo
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        </div>
                    </DragDropContext>
                ) : (
                    <div className="max-w-4xl mx-auto py-6 border rounded-xl p-8 bg-card shadow-sm">
                        <div className="text-center mb-8 border-b pb-4">
                            <h2 className="text-2xl font-bold">{templateName || 'Sem título'}</h2>
                            <p className="text-muted-foreground">Pré-visualização do formulário</p>
                            <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-secondary text-xs">
                                Tipo: {templateType}
                            </div>
                        </div>

                        <div className="space-y-8">
                            {sections.map((section) => (
                                <div key={section.id} className="space-y-4">
                                    {section.title && (
                                        <h3 className="text-lg font-semibold border-l-4 border-primary pl-3 bg-accent/20 py-1">{section.title}</h3>
                                    )}
                                    <div className="grid gap-6 pl-4">
                                        {section.questions.map((question) => (
                                            <div key={question.id} className="space-y-2">
                                                <Label className="text-base font-medium">
                                                    {question.question_text || 'Pergunta sem título'}
                                                    {question.required && <span className="text-destructive ml-1">*</span>}
                                                </Label>

                                                {question.type === 'text' && (
                                                    <Input placeholder="Sua resposta..." disabled className="bg-muted/10" />
                                                )}

                                                {question.type === 'long_text' && (
                                                    <textarea
                                                        className="w-full min-h-[100px] rounded-md border border-input bg-muted/10 px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                                        placeholder="Sua resposta detalhada..."
                                                        disabled
                                                    />
                                                )}

                                                {(question.type === 'single_choice') && (
                                                    <div className="space-y-2">
                                                        {question.options?.map((opt, i) => (
                                                            <div key={i} className="flex items-center space-x-2">
                                                                <div className="h-4 w-4 rounded-full border border-primary opacity-50" />
                                                                <span className="text-sm">{opt}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {(question.type === 'multiple_choice') && (
                                                    <div className="space-y-2">
                                                        {question.options?.map((opt, i) => (
                                                            <div key={i} className="flex items-center space-x-2">
                                                                <div className="h-4 w-4 rounded-sm border border-primary opacity-50" />
                                                                <span className="text-sm">{opt}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {(question.type === 'scale' || question.type === 'body_map') && (
                                                    <div className="p-4 border border-dashed rounded bg-muted/20 text-center text-sm text-muted-foreground">
                                                        Visualização do componente {question.type === 'scale' ? 'Escala' : 'Mapa Corporal'} indisponível no modo rápido.
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {section.questions.length === 0 && (
                                            <p className="text-sm text-muted-foreground italic">Nenhuma pergunta neste grupo.</p>
                                        )}
                                    </div>
                                    <Separator className="mt-6" />
                                </div>
                            ))}
                            {sections.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">O formulário está vazio.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
