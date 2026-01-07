import { useState } from 'react';
import { EvaluationFormField, ClinicalFieldType } from '@/types/clinical-forms';

export const useFormBuilder = (initialFields: EvaluationFormField[] = []) => {
    const [fields, setFields] = useState<EvaluationFormField[]>(initialFields);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

    const addField = (tipo_campo: ClinicalFieldType) => {
        const newField: EvaluationFormField = {
            id: crypto.randomUUID(),
            form_id: 'temp',
            tipo_campo,
            label: 'Novo Campo',
            placeholder: '',
            obrigatorio: false,
            ordem: fields.length,
            opcoes: ['opcao_unica', 'selecao', 'lista'].includes(tipo_campo) ? ['Opção 1', 'Opção 2'] : undefined
        };
        setFields([...fields, newField]);
        setSelectedFieldId(newField.id);
    };

    const updateField = (id: string, updates: Partial<EvaluationFormField>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    const reorderFields = (newOrder: EvaluationFormField[]) => {
        setFields(newOrder.map((f, index) => ({ ...f, ordem: index })));
    };

    return {
        fields,
        setFields, // Exposed for loading initial data
        selectedFieldId,
        setSelectedFieldId,
        addField,
        updateField,
        removeField,
        reorderFields
    };
};
