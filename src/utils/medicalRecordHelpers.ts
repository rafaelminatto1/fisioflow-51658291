import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { logger } from '@/lib/errors/logger';

export const saveSurgeries = async (
    supabase: SupabaseClient,
    recordId: string,
    newSurgeries: Array<{ name: string; date: string; surgeon: string; hospital: string; notes?: string }>
) => {
    // First delete existing surgeries for this record to avoid duplicates/handle updates
    const { error: deleteError } = await supabase
        .from('surgeries')
        .delete()
        .eq('medical_record_id', recordId);

    if (deleteError) {
        logger.error("Error deleting existing surgeries", deleteError, 'medicalRecordHelpers');
        toast.error("Erro ao atualizar cirurgias");
        throw new Error("Failed to update surgeries");
    }

    const validSurgeries = newSurgeries.filter(s => s.name);
    if (validSurgeries.length === 0) return;

    const { error } = await supabase.from('surgeries').insert(
        validSurgeries.map(s => ({
            medical_record_id: recordId,
            name: s.name,
            surgery_date: s.date || null,
            surgeon: s.surgeon,
            hospital: s.hospital,
            notes: s.notes
        }))
    );

    if (error) {
        logger.error("Error saving surgeries", error, 'medicalRecordHelpers');
        toast.error("Erro ao salvar cirurgias");
        throw new Error("Failed to save surgeries");
    }
};

export const saveGoals = async (
    supabase: SupabaseClient,
    recordId: string,
    newGoals: Array<{ description: string; targetDate: string }>
) => {
    // First delete existing goals for this record
    const { error: deleteError } = await supabase
        .from('goals')
        .delete()
        .eq('medical_record_id', recordId);

    if (deleteError) {
        logger.error("Error deleting existing goals", deleteError, 'medicalRecordHelpers');
        toast.error("Erro ao atualizar objetivos");
        throw new Error("Failed to update goals");
    }

    const validGoals = newGoals.filter(g => g.description);
    if (validGoals.length === 0) return;

    const { error } = await supabase.from('goals').insert(
        validGoals.map(g => ({
            medical_record_id: recordId,
            description: g.description,
            target_date: g.targetDate || null,
            status: 'active'
        }))
    );

    if (error) {
        logger.error("Error saving goals", error, 'medicalRecordHelpers');
        toast.error("Erro ao salvar objetivos");
        throw new Error("Failed to save goals");
    }
};

export const savePathologies = async (
    supabase: SupabaseClient,
    recordId: string,
    newPathologies: Array<{ name: string; status: 'active' | 'treated'; diagnosedAt: string }>
) => {
    // First delete existing pathologies for this record
    const { error: deleteError } = await supabase
        .from('pathologies')
        .delete()
        .eq('medical_record_id', recordId);

    if (deleteError) {
        logger.error("Error deleting existing pathologies", deleteError, 'medicalRecordHelpers');
        toast.error("Erro ao atualizar patologias");
        throw new Error("Failed to update pathologies");
    }

    const validPathologies = newPathologies.filter(p => p.name);
    if (validPathologies.length === 0) return;

    const { error } = await supabase.from('pathologies').insert(
        validPathologies.map(p => ({
            medical_record_id: recordId,
            name: p.name,
            status: p.status,
            diagnosed_at: p.diagnosedAt || null,
        }))
    );

    if (error) {
        logger.error("Error saving pathologies", error, 'medicalRecordHelpers');
        toast.error("Erro ao salvar patologias");
        throw new Error("Failed to save pathologies");
    }
};
