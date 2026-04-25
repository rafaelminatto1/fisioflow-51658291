/**
 * useAssetAnnotations - Migrated to Neon/Workers
 */

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { mediaApi } from "@/api/v2";
import { fisioLogger as logger } from "@/lib/errors/logger";

export interface Annotation {
  id: string;
  type: "arrow" | "circle" | "rect" | "text" | "ruler" | "angle";
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

  useEffect(() => {
    if (!assetId) {
      setAnnotations([]);
      setVersions([]);
      setCurrentVersion(1);
      return;
    }

    const loadAnnotations = async () => {
      setIsLoading(true);
      try {
        const response = await mediaApi.annotations.list(assetId);
        const versionDocs = ((response?.data ?? []) as AnnotationVersion[]).map((item) => ({
          version: Number(item.version),
          data: Array.isArray(item.data) ? item.data : [],
          created_at: item.created_at,
          author_id: item.author_id,
        }));

        setVersions(versionDocs);

        const latestVersion = versionDocs[0];
        if (latestVersion) {
          setCurrentVersion(latestVersion.version);
          setAnnotations(latestVersion.data);
        } else {
          setCurrentVersion(1);
          setAnnotations([]);
        }
      } catch (error) {
        logger.error("Error loading annotations", error, "useAssetAnnotations");
        toast({
          variant: "destructive",
          title: "Erro ao carregar anotações",
          description: error instanceof Error ? error.message : "Erro desconhecido",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnotations();
  }, [assetId, toast]);

  const saveVersion = useCallback(async () => {
    if (!assetId) return;

    try {
      const nextVersion = (versions.length > 0 ? versions[0].version : 0) + 1;
      const response = await mediaApi.annotations.create({
        asset_id: assetId,
        version: nextVersion,
        data: annotations as unknown as Record<string, unknown>[],
      });

      const saved = response.data;
      const newVersion: AnnotationVersion = {
        version: Number(saved.version),
        data: Array.isArray(saved.data) ? (saved.data as Annotation[]) : [],
        created_at: saved.created_at,
        author_id: saved.author_id,
      };

      setCurrentVersion(nextVersion);
      setVersions((prev) => [newVersion, ...prev]);

      toast({
        title: "Anotações salvas",
        description: `Versão ${nextVersion} criada com sucesso.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
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
    setCurrentVersion: (version: number) => {
      const target = versions.find((item) => item.version === version);
      if (target) {
        setAnnotations(target.data);
        setCurrentVersion(version);
      }
    },
  };
};
