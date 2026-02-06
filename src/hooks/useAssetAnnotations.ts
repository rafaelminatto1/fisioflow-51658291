/**
 * useAssetAnnotations - Migrated to Firebase
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDoc, getDocs, query as firestoreQuery, where, addDoc, updateDoc, orderBy, db } from '@/integrations/firebase/app';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'rect' | 'text' | 'ruler' | 'angle';
  x: number;
  y: number;
  points?: number[];
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
  const { user } = useAuth();

  // Load annotations for the asset
  useEffect(() => {
    if (!assetId) {
      setAnnotations([]);
      return;
    }

    const loadAnnotations = async () => {
      setIsLoading(true);
      try {
        const annotationsQuery = firestoreQuery(
          collection(db, 'asset_annotations'),
          where('asset_id', '==', assetId),
          orderBy('version', 'desc')
        );
        const snapshot = await getDocs(annotationsQuery);

        if (!snapshot.empty) {
          const versionDocs = snapshot.docs.map(doc => ({
            version: doc.data().version,
            data: doc.data().data,
            created_at: doc.data().created_at,
            author_id: doc.data().author_id
          }));

          setVersions(versionDocs);

          // Load the latest version
          const latestVersion = versionDocs[0];
          if (latestVersion) {
            setCurrentVersion(latestVersion.version);
            setAnnotations(latestVersion.data);
          }
        } else {
          setVersions([]);
          setCurrentVersion(1);
          setAnnotations([]);
        }
      } catch (error) {
        logger.error('Error loading annotations', error, 'useAssetAnnotations');
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar anotações',
          description: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnotations();
  }, [assetId, toast]);

  // Save current state as a new version
  const saveVersion = useCallback(async () => {
    if (!assetId || !user) return;

    try {
      const nextVersion = (versions.length > 0 ? versions[0].version : 0) + 1;

      await addDoc(collection(db, 'asset_annotations'), {
        asset_id: assetId,
        version: nextVersion,
        data: annotations,
        created_at: new Date().toISOString(),
        author_id: user.uid
      });

      setCurrentVersion(nextVersion);
      setVersions(prev => [{
        version: nextVersion,
        data: annotations,
        created_at: new Date().toISOString(),
        author_id: user.uid
      }, ...prev]);

      toast({
        title: 'Anotações salvas',
        description: `Versão ${nextVersion} criada com sucesso.`
      });

    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: e instanceof Error ? e.message : 'Erro desconhecido'
      });
    }
  }, [assetId, annotations, versions, user, toast]);

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
