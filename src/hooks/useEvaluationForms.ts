/**
 * useEvaluationForms - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('evaluation_forms') → Firestore collection 'evaluation_forms'
 * - supabase.from('evaluation_form_fields') → Firestore collection 'evaluation_form_fields'
 * - Preserved JSON serialization for opcoes field
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EvaluationForm, EvaluationFormWithFields, EvaluationFormField } from '@/types/clinical-forms';
import { db } from '@/integrations/firebase/app';
import { logger } from '@/lib/errors/logger';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';


export type EvaluationFormFormData = {
  nome: string;
  descricao?: string | null;
  referencias?: string | null;
  tipo: string;
  ativo?: boolean;
};

export type EvaluationFormFieldFormData = Omit<EvaluationFormField, 'id' | 'created_at' | 'form_id'>;

// Helper to convert Firestore doc to EvaluationForm
const convertDocToEvaluationForm = (doc: { id: string; data: () => Record<string, unknown> }): EvaluationForm => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as EvaluationForm;
};

// Helper to convert Firestore doc to EvaluationFormField
const convertDocToEvaluationFormField = (doc: { id: string; data: () => Record<string, unknown> }): EvaluationFormField => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
  } as EvaluationFormField;
};

export function useEvaluationForms(tipo?: string) {
  return useQuery({
    queryKey: ['evaluation-forms', tipo],
    queryFn: async () => {
      const q = query(
        collection(db, 'evaluation_forms'),
        where('ativo', '==', true),
        orderBy('nome')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(convertDocToEvaluationForm);

      // Filter by tipo if provided
      if (tipo) {
        data = data.filter(f => f.tipo === tipo);
      }

      return data;
    },
  });
}

export function useEvaluationFormWithFields(formId: string | undefined) {
  return useQuery({
    queryKey: ['evaluation-form', formId],
    queryFn: async () => {
      if (!formId) return null;

      const formDoc = await getDoc(doc(db, 'evaluation_forms', formId));
      if (!formDoc.exists()) {
        throw new Error('Ficha não encontrada');
      }

      const q = query(
        collection(db, 'evaluation_form_fields'),
        where('form_id', '==', formId),
        orderBy('ordem')
      );

      const fieldsSnap = await getDocs(q);
      const fields = fieldsSnap.docs.map(convertDocToEvaluationFormField);

      return { ...convertDocToEvaluationForm(formDoc), fields } as unknown as EvaluationFormWithFields;
    },
    enabled: !!formId,
  });
}

export function useCreateEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: EvaluationFormFormData) => {
      const formData = {
        ...form,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'evaluation_forms'), formData);
      const docSnap = await getDoc(docRef);

      return convertDocToEvaluationForm(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha de avaliação criada com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao criar ficha de avaliação.');
    },
  });
}

export function useUpdateEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...form }: Partial<EvaluationForm> & { id: string }) => {
      const docRef = doc(db, 'evaluation_forms', id);
      await updateDoc(docRef, {
        ...form,
        updated_at: new Date().toISOString(),
      });

      const docSnap = await getDoc(docRef);
      return convertDocToEvaluationForm(docSnap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha de avaliação atualizada com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao atualizar ficha de avaliação.');
    },
  });
}

export function useDeleteEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(db, 'evaluation_forms', id);
      await updateDoc(docRef, { ativo: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha de avaliação excluída com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao excluir ficha de avaliação.');
    },
  });
}

export function useDuplicateEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Get original form
      const originalDoc = await getDoc(doc(db, 'evaluation_forms', id));
      if (!originalDoc.exists()) {
        throw new Error('Ficha não encontrada');
      }

      const originalForm = convertDocToEvaluationForm(originalDoc);

      // 2. Create new form
      const formData = {
        nome: `${originalForm.nome} (Cópia)`,
        descricao: originalForm.descricao,
        referencias: originalForm.referencias,
        tipo: originalForm.tipo,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newFormRef = await addDoc(collection(db, 'evaluation_forms'), formData);
      const newFormSnap = await getDoc(newFormRef);
      const newForm = convertDocToEvaluationForm(newFormSnap);

      // 3. Get original fields
      const q = query(
        collection(db, 'evaluation_form_fields'),
        where('form_id', '==', id)
      );
      const fieldsSnap = await getDocs(q);
      const fields = fieldsSnap.docs.map(convertDocToEvaluationFormField);

      // 4. Insert new fields
      if (fields && fields.length > 0) {
        const newFields = fields.map(f => ({
          form_id: newForm.id,
          tipo_campo: f.tipo_campo,
          label: f.label,
          placeholder: f.placeholder,
          opcoes: f.opcoes,
          ordem: f.ordem,
          obrigatorio: f.obrigatorio,
          grupo: f.grupo,
          descricao: f.descricao,
          minimo: f.minimo,
          maximo: f.maximo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        await Promise.all(
          newFields.map(field => addDoc(collection(db, 'evaluation_form_fields'), field))
        );
      }

      return newForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha duplicada com sucesso.');
    },
    onError: (error) => {
      logger.error('Erro ao duplicar ficha', error, 'useEvaluationForms');
      toast.error('Erro ao duplicar ficha.');
    },
  });
}

// Field mutations
export function useAddFormField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ formId, field }: { formId: string; field: EvaluationFormFieldFormData }) => {
      const fieldData = {
        ...field,
        form_id: formId,
        opcoes: field.opcoes ? JSON.stringify(field.opcoes) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'evaluation_form_fields'), fieldData);
      const docSnap = await getDoc(docRef);

      return convertDocToEvaluationFormField(docSnap);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-form', variables.formId] });
      toast.success('Campo adicionado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao adicionar campo.');
    },
  });
}

export function useUpdateFormField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, _formId, ...field }: Partial<EvaluationFormField> & { id: string; formId: string }) => {
      const docRef = doc(db, 'evaluation_form_fields', id);
      const updateData: Record<string, unknown> = { ...field };

      if (updateData.opcoes) {
        updateData.opcoes = JSON.stringify(updateData.opcoes);
      }

      updateData.updated_at = new Date().toISOString();

      await updateDoc(docRef, updateData);

      const docSnap = await getDoc(docRef);
      return convertDocToEvaluationFormField(docSnap);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-form', variables.formId] });
      toast.success('Campo atualizado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao atualizar campo.');
    },
  });
}

export function useDeleteFormField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, _formId }: { id: string; formId: string }) => {
      await deleteDoc(doc(db, 'evaluation_form_fields', id));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-form', variables.formId] });
      toast.success('Campo excluído com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao excluir campo.');
    },
  });
}

export type EvaluationFormImportData = {
  nome: string;
  descricao?: string | null;
  referencias?: string | null;
  tipo: string;
  fields: EvaluationFormFieldFormData[];
};

export function useImportEvaluationForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EvaluationFormImportData) => {
      // 1. Create form
      const formData = {
        nome: data.nome,
        descricao: data.descricao,
        referencias: data.referencias,
        tipo: data.tipo,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const formRef = await addDoc(collection(db, 'evaluation_forms'), formData);
      const formSnap = await getDoc(formRef);
      const form = convertDocToEvaluationForm(formSnap);

      // 2. Insert fields
      if (data.fields && data.fields.length > 0) {
        const fieldsToInsert = data.fields.map(f => ({
          form_id: form.id,
          tipo_campo: f.tipo_campo,
          label: f.label,
          placeholder: f.placeholder,
          opcoes: typeof f.opcoes === 'object' && f.opcoes !== null ? JSON.stringify(f.opcoes) : f.opcoes,
          ordem: f.ordem,
          obrigatorio: f.obrigatorio,
          grupo: f.grupo,
          descricao: f.descricao,
          minimo: f.minimo,
          maximo: f.maximo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        await Promise.all(
          fieldsToInsert.map(field => addDoc(collection(db, 'evaluation_form_fields'), field))
        );
      }

      return form;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      toast.success('Ficha importada com sucesso.');
    },
    onError: (error) => {
      logger.error('Erro ao importar ficha', error, 'useEvaluationForms');
      toast.error('Erro ao importar ficha.');
    },
  });
}
