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

        const fetchAnnotations = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('annotations')
                .select('*')
                .eq('asset_id', assetId)
                .order('version', { ascending: false });

            if (error) {
                console.error('Error fetching annotations:', error);
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar anotações",
                    description: error.message
                });
            } else if (data && data.length > 0) {
                // Load latest version by default
                const latest = data[0];
                setAnnotations(latest.data as Annotation[]);
                setCurrentVersion(latest.version);
                setVersions(data.map(d => ({
                    version: d.version,
                    data: d.data as Annotation[],
                    created_at: d.created_at,
                    author_id: d.author_id
                })));
            } else {
                // No annotations yet
                setAnnotations([]);
                setCurrentVersion(1);
                setVersions([]);
            }
            setIsLoading(false);
        };

        fetchAnnotations();
    }, [assetId, toast]);

    // Save current state as a new version
    const saveVersion = useCallback(async () => {
        if (!assetId) return;

        try {
            const nextVersion = (versions.length > 0 ? versions[0].version : 0) + 1;

            const { data: user } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('annotations')
                .insert({
                    asset_id: assetId,
                    organization_id: (await supabase.from('profiles').select('organization_id').eq('user_id', user.user?.id).single()).data?.organization_id,
                    type: 'canvas_v1',
                    data: annotations, // JSONB
                    version: nextVersion,
                    author_id: user.user?.id
                });

            if (error) throw error;

            setCurrentVersion(nextVersion);
            // Refresh versions logic ideally would re-fetch or optimistically update
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

        } catch (e: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: e.message
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
