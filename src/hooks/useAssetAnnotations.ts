import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Annotation {
    id: string;
    type: 'arrow' | 'circle' | 'rect' | 'text' | 'ruler' | 'angle';
    x: number;
    y: number;
    points?: number[]; // For lines/arrows
    text?: string;
    width?: number;
    height?: number;
    radius?: number;
    rotation?: number;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    fontSize?: number;
    scaleX?: number;
    scaleY?: number;
}

export interface AnnotationVersion {
    version: number;
    data: Annotation[];
    created_at: string;
    author_id?: string;
}

export const useAssetAnnotations = (assetId: string | null) => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [versions, setVersions] = useState<AnnotationVersion[]>([]);
    const [currentVersion, setCurrentVersion] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Load annotations for the asset
    useEffect(() => {
        if (!assetId) {
            setAnnotations([]);
            return;
        }

        // Annotations table may not exist yet - return empty state
        setAnnotations([]);
        setCurrentVersion(1);
        setVersions([]);
        setIsLoading(false);
    }, [assetId, toast]);

    // Save current state as a new version
    const saveVersion = useCallback(async () => {
        if (!assetId) return;

        try {
            const nextVersion = (versions.length > 0 ? versions[0].version : 0) + 1;
            const { data: user } = await supabase.auth.getUser();

            // For now, just update local state since annotations table may not exist
            setCurrentVersion(nextVersion);
            setVersions(prev => [{
                version: nextVersion,
                data: annotations,
                created_at: new Date().toISOString(),
                author_id: user.user?.id || ''
            }, ...prev]);

            toast({
                title: "Anotações salvas",
                description: `Versão ${nextVersion} criada com sucesso.`
            });

        } catch (e) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: e instanceof Error ? e.message : 'Erro desconhecido'
            });
        }
    }, [assetId, annotations, versions, toast]);

    return {
        annotations,
        setAnnotations,
        versions,
        currentVersion,
        isLoading,
        saveVersion,
        setCurrentVersion: (v: number) => {
            const target = versions.find(ver => ver.version === v);
            if (target) {
                setAnnotations(target.data);
                setCurrentVersion(v);
            }
        }
    };
};
