import React, { useEffect, useState } from 'react';
import { useFormBuilder } from './useFormBuilder';
import { Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Type,
    AlignLeft,
    List,
    CheckSquare,
    CheckCircle,
    Calendar,
    Clock,
    Info,
    Trash2,
    GripVertical,
    Save,
    Loader2,
    Hash
} from 'lucide-react';
import { ClinicalFieldType, EvaluationForm } from '@/types/clinical-forms';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';
import { getFirebaseAuth, getFirebaseDb, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, deleteDoc } from '@/integrations/firebase/app';
import { onAuthStateChanged } from 'firebase/auth';
import { doc as docRef, getDoc as getDocFromFirestore, setDoc as setDocToFirestore, updateDoc as updateDocInFirestore, collection as collectionRef, getDocs as getDocsFromCollection, query as queryFromFirestore, where as whereFn, deleteDoc as deleteDocFromFirestore } from 'firebase/firestore';

interface FormBuilderProps {
    formId?: string; // If provided, we are editing specific fields for this form
    initialData?: EvaluationForm; // Optional initial data
    onSave?: () => void;
    onBack?: () => void;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({ formId, initialData, onSave, onBack }) => {
    const {
        fields,
        setFields,
        selectedFieldId,
        setSelectedFieldId,
        addField,
        updateField,
        removeField,
        reorderFields
    } = useFormBuilder(initialData?.fields);

    // If initialData is provided, we use its title/desc. Otherwise local state (though likely provided by parent).
    const [nome, setNome] = useState(initialData?.nome || 'Nova Ficha de Avaliação');
    const [descricao, setDescricao] = useState(initialData?.descricao || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();

    useEffect(() => {
        if (initialData) {
            setNome(initialData.nome);
            setDescricao(initialData.descricao || '');
            if (initialData.fields) {
                setFields(initialData.fields.map(f => ({ ...f, tipo_campo: f.tipo_campo as ClinicalFieldType })));
            }
        }
    }, [initialData, setFields]);

    const handleSave = async () => {
        if (!nome.trim()) {
            toast({ title: "Erro", description: "O nome da ficha é obrigatório.", variant: "destructive" });
            return;
        }

        if (fields.length === 0) {
            // Safety check: if we are editing an existing form that HAD fields, and now has 0, warn.
            // Simplified logic: just error if generic empty for now, unless user explicitly deleted all?
            // Let's stick to: "Formulário deve ter pelo menos um campo".
            toast({ title: "Erro", description: "Adicione pelo menos um campo à ficha.", variant: "destructive" });
            return;
        }

        // Safety check: if initialData had fields but current fields is empty (handled above) or very different?
        // Let's just proceed for now.

        setIsSaving(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Usuário não autenticado');

            let currentFormId = formId;

            // 1. Update or Create Form
            if (formId) {
                const formRef = docRef(db, 'evaluation_forms', formId);
                await updateDocInFirestore(formRef, {
                    nome,
                    descricao,
                    updated_at: new Date().toISOString()
                });
            } else {
                // Create new form
                const newFormRef = docRef(collectionRef(db, 'evaluation_forms'));
                currentFormId = newFormRef.id;

                await setDocToFirestore(newFormRef, {
                    nome,
                    descricao,
                    tipo: 'custom', // Default for new builder forms
                    ativo: true,
                    created_at: new Date().toISOString(),
                    // organization_id usually handled by trigger or RLS provided context, or we fetch user's org
                });
            }

            // 2. Sync Fields (Delete all and recreate is easiest for order/updates, but might break responses references?
            // Better: Upsert. But simpler for now:
            // Strategy: Delete all existing fields for this form and re-insert.
            // WARNING: This changes IDs. If records depend on field IDs, this is bad.
            // Better Strategy: Upsert based on some criteria? No, we have dragging ordering.
            // Let's rely on matching IDs if they exist (were loaded from DB), otherwise create new.

            // For now, to ensure clean state and order, we might delete-insert if no data exists yet.
            // But if there's data, we must preserve IDs.
            // Our `useFormBuilder` uses generic UUIDs for new fields. Existing fields have DB IDs.

            // Let's try upserting.

            const fieldsToUpsert = fields.map((f, index) => ({
                form_id: currentFormId,
                tipo_campo: f.tipo_campo,
                label: f.label,
                placeholder: f.placeholder,
                opcoes: f.opcoes || null, // Array of strings is valid Json.
                ordem: index,
                obrigatorio: f.obrigatorio
            }));

            // We need to handle deletions. Fields in DB that are NOT in `fields` array should be deleted.
            if (formId) {
                const q = queryFromFirestore(collectionRef(db, 'evaluation_form_fields'), whereFn('form_id', '==', formId));
                const existingFieldsSnap = await getDocsFromCollection(q);

                const currentIds = new Set(fields.map(f => f.id));
                const idsToDelete = existingFieldsSnap.docs.filter(docSnap => !currentIds.has(docSnap.id)).map(docSnap => docSnap.id);

                if (idsToDelete.length > 0) {
                    for (const id of idsToDelete) {
                        await deleteDocFromFirestore(docRef(db, 'evaluation_form_fields', id));
                    }
                }
            }

            // Upsert each field
            for (const f of fieldsToUpsert) {
                const fieldId = fields[fieldsToUpsert.indexOf(f)].id;
                const fieldRef = docRef(db, 'evaluation_form_fields', fieldId);
                await setDocToFirestore(fieldRef, f, { merge: true });
            }

            toast({
                title: "Sucesso",
                description: "Ficha salva com sucesso!"
            });

            if (onSave) onSave();

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro ao salvar a ficha.";
            logger.error('Erro ao salvar ficha de avaliação', error, 'FormBuilder');
            toast({
                title: "Erro ao salvar",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const icons: Record<ClinicalFieldType, React.ReactNode> = {
        texto_curto: <Type size={16} />,
        texto_longo: <AlignLeft size={16} />,
        numero: <Hash size={16} />,
        opcao_unica: <CheckCircle size={16} />,
        selecao: <CheckSquare size={16} />,
        lista: <List size={16} />,
        escala: <div className="text-[10px] font-bold border rounded px-1">1-5</div>,
        data: <Calendar size={16} />,
        hora: <Clock size={16} />,
        info: <Info size={16} />
    };

    const selectedField = fields.find(f => f.id === selectedFieldId);

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6">
            {/* Main Canvas */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <Card className="flex-none bg-muted/20 border-muted">
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nome da Ficha</Label>
                                <Input
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="text-lg font-semibold"
                                    placeholder="Ex: Avaliação de Pilates"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Textarea
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    placeholder="Descrição opcional..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex-1 overflow-y-auto px-1">
                    <div className="space-y-4 pb-10">
                        <Reorder.Group axis="y" values={fields} onReorder={reorderFields} className="space-y-3">
                            {fields.map((field) => (
                                <Reorder.Item key={field.id} value={field}>
                                    <Card
                                        className={`cursor-pointer transition-all hover:border-primary/50 group ${selectedFieldId === field.id ? 'border-primary ring-1 ring-primary shadow-sm' : ''}`}
                                        onClick={() => setSelectedFieldId(field.id)}
                                    >
                                        <CardContent className="p-4 flex items-start gap-3">
                                            <div className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground" onPointerDown={(e) => e.preventDefault()}>
                                                <GripVertical size={20} />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    {icons[field.tipo_campo]}
                                                    <span className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
                                                        {field.tipo_campo.replace('_', ' ')}
                                                    </span>
                                                    {field.obrigatorio && <span className="text-destructive text-xs font-medium">*Obrigatório</span>}
                                                </div>
                                                <Label className="text-base pointer-events-none">{field.label}</Label>
                                                {field.placeholder && (
                                                    <div className="text-sm text-muted-foreground italic">{field.placeholder}</div>
                                                )}

                                                {(field.tipo_campo === 'opcao_unica' || field.tipo_campo === 'selecao' || field.tipo_campo === 'lista') && field.opcoes && (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {field.opcoes.map((opt, i) => (
                                                            <div key={i} className="text-xs bg-secondary px-2 py-1 rounded-md text-secondary-foreground border">
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeField(field.id);
                                                }}
                                            >
                                                <Trash2 size={18} />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>

                        {fields.length === 0 && (
                            <div className="text-center py-16 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/5">
                                <p className="mb-2 font-medium">Sua ficha está vazia</p>
                                <p className="text-sm">Selecione um tipo de campo no painel à direita para começar.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between pt-4 border-t mt-auto items-center">
                    {onBack && (
                        <Button variant="outline" onClick={onBack}>
                            Voltar
                        </Button>
                    )}
                    <Button size="lg" onClick={handleSave} disabled={isSaving} className="ml-auto">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Ficha
                    </Button>
                </div>
            </div>

            {/* Sidebar Toolpanel */}
            <div className="w-[320px] flex flex-col gap-4 flex-none h-full overflow-hidden">

                {selectedField ? (
                    <Card className="flex-1 flex flex-col overflow-hidden border-l-4 border-l-primary">
                        <CardHeader className="pb-3 border-b bg-muted/10">
                            <CardTitle className="text-base flex items-center justify-between">
                                Editar Campo
                                <Button variant="ghost" size="sm" onClick={() => setSelectedFieldId(null)}>Fechar</Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6 overflow-y-auto flex-1">
                            <div className="space-y-2">
                                <Label>Pergunta / Rótulo</Label>
                                <Input
                                    value={selectedField.label}
                                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Texto de Ajuda / Placeholder</Label>
                                <Input
                                    value={selectedField.placeholder || ''}
                                    onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center justify-between py-2 border px-3 rounded-lg bg-muted/20">
                                <Label className="cursor-pointer" htmlFor="required-switch">Campo Obrigatório</Label>
                                <Switch
                                    id="required-switch"
                                    checked={selectedField.obrigatorio}
                                    onCheckedChange={(c) => updateField(selectedField.id, { obrigatorio: c })}
                                />
                            </div>

                            {(selectedField.tipo_campo === 'opcao_unica' || selectedField.tipo_campo === 'selecao' || selectedField.tipo_campo === 'lista') && (
                                <div className="space-y-2">
                                    <Label>Opções</Label>
                                    <Textarea
                                        value={selectedField.opcoes?.join('\n') || ''}
                                        onChange={(e) => updateField(selectedField.id, { opcoes: e.target.value.split('\n') })}
                                        rows={6}
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">Digite cada opção em uma nova linha.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="flex-1 flex flex-col overflow-hidden">
                        <CardHeader className="pb-3 border-b bg-muted/10">
                            <CardTitle className="text-base">Adicionar Campo</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 grid gap-2 overflow-y-auto flex-1 content-start">
                            <Button variant="outline" className="justify-start gap-3 h-auto py-4 hover:border-primary hover:bg-primary/5 transition-all text-left group" onClick={() => addField('texto_curto')}>
                                <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20"><Type size={18} className="text-primary" /></div>
                                <div>
                                    <div className="font-medium">Texto Curto</div>
                                    <div className="text-xs text-muted-foreground font-normal">Nome, Telefone, Idade</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start gap-3 h-auto py-4 hover:border-primary hover:bg-primary/5 transition-all text-left group" onClick={() => addField('texto_longo')}>
                                <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20"><AlignLeft size={18} className="text-primary" /></div>
                                <div>
                                    <div className="font-medium">Texto Longo</div>
                                    <div className="text-xs text-muted-foreground font-normal">Observações, Histórico</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start gap-3 h-auto py-4 hover:border-primary hover:bg-primary/5 transition-all text-left group" onClick={() => addField('opcao_unica')}>
                                <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20"><CheckCircle size={18} className="text-primary" /></div>
                                <div>
                                    <div className="font-medium">Seleção Única</div>
                                    <div className="text-xs text-muted-foreground font-normal">Sim/Não, Gênero</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start gap-3 h-auto py-4 hover:border-primary hover:bg-primary/5 transition-all text-left group" onClick={() => addField('selecao')}>
                                <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20"><CheckSquare size={18} className="text-primary" /></div>
                                <div>
                                    <div className="font-medium">Múltipla Escolha</div>
                                    <div className="text-xs text-muted-foreground font-normal">Sintomas, Queixas</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start gap-3 h-auto py-4 hover:border-primary hover:bg-primary/5 transition-all text-left group" onClick={() => addField('escala')}>
                                <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20"><div className="text-[10px] font-bold border border-primary text-primary rounded px-1">1-5</div></div>
                                <div>
                                    <div className="font-medium">Escala Numérica</div>
                                    <div className="text-xs text-muted-foreground font-normal">Nível de Dor (EVA)</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start gap-3 h-auto py-4 hover:border-primary hover:bg-primary/5 transition-all text-left group" onClick={() => addField('data')}>
                                <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20"><Calendar size={18} className="text-primary" /></div>
                                <div>
                                    <div className="font-medium">Data</div>
                                    <div className="text-xs text-muted-foreground font-normal">Data de Início, Evento</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start gap-3 h-auto py-4 hover:border-primary hover:bg-primary/5 transition-all text-left group" onClick={() => addField('info')}>
                                <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20"><Info size={18} className="text-primary" /></div>
                                <div>
                                    <div className="font-medium">Informação</div>
                                    <div className="text-xs text-muted-foreground font-normal">Título de Seção, Aviso</div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start gap-3 h-auto py-4 hover:border-primary hover:bg-primary/5 transition-all text-left group" onClick={() => addField('numero')}>
                                <div className="bg-primary/10 p-2 rounded group-hover:bg-primary/20"><Hash size={18} className="text-primary" /></div>
                                <div>
                                    <div className="font-medium">Número</div>
                                    <div className="text-xs text-muted-foreground font-normal">Medidas, Quantidade</div>
                                </div>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};
