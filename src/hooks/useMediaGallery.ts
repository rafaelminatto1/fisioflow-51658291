"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "youtube";
  url: string;
  thumbnailUrl?: string | null;
  folder: string;
  metadata?: any;
  createdAt: string;
}

export function useMediaGallery() {
  const { getNeonAccessToken } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGallery = useCallback(
    async (params?: { folder?: string; type?: string }) => {
      setLoading(true);
      try {
        const token = await getNeonAccessToken();
        const query = new URLSearchParams();
        if (params?.folder) query.append("folder", params.folder);
        if (params?.type) query.append("type", params.type);

        const response = await fetch(`/api/media/gallery?${query.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        setMedia(result.data || []);
      } catch (error) {
        console.error("Erro ao carregar galeria:", error);
        toast.error("Erro ao carregar galeria de mídia");
      } finally {
        setLoading(false);
      }
    },
    [getNeonAccessToken],
  );

  const fetchFolders = useCallback(async () => {
    try {
      const token = await getNeonAccessToken();
      const response = await fetch("/api/media/gallery/folders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      setFolders(result.data || []);
    } catch (error) {
      console.error("Erro ao carregar pastas:", error);
    }
  }, [getNeonAccessToken]);

  const saveToGallery = async (data: Omit<MediaItem, "id" | "createdAt">) => {
    try {
      const token = await getNeonAccessToken();
      const response = await fetch("/api/media/gallery", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      // Refresh list
      fetchGallery();
      fetchFolders();

      return result.data;
    } catch (error) {
      console.error("Erro ao salvar na galeria:", error);
      toast.error("Erro ao salvar arquivo na galeria");
      throw error;
    }
  };

  const deleteFromGallery = async (id: string) => {
    try {
      const token = await getNeonAccessToken();
      const response = await fetch(`/api/media/gallery/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        toast.success("Mídia removida da galeria");
      }
    } catch (error) {
      console.error("Erro ao deletar mídia:", error);
      toast.error("Erro ao remover mídia");
    }
  };

  return {
    media,
    folders,
    loading,
    fetchGallery,
    fetchFolders,
    saveToGallery,
    deleteFromGallery,
  };
}

export function useExerciseMedia(exerciseId?: string) {
  const { getNeonAccessToken } = useAuth();
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!exerciseId) return;
    setLoading(true);
    try {
      const token = await getNeonAccessToken();
      const response = await fetch(`/api/media/exercise/${exerciseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      setAttachments(result.data || []);
    } catch (error) {
      console.error("Erro ao carregar mídias do exercício:", error);
    } finally {
      setLoading(false);
    }
  }, [exerciseId, getNeonAccessToken]);

  const attachMedia = async (mediaData: {
    mediaId?: string;
    type: string;
    url: string;
    orderIndex: number;
    caption?: string;
  }) => {
    if (!exerciseId) return;
    try {
      const token = await getNeonAccessToken();
      const response = await fetch(`/api/media/exercise/${exerciseId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mediaData),
      });
      const result = await response.json();
      fetchAttachments();
      return result.data;
    } catch (error) {
      console.error("Erro ao anexar mídia:", error);
      toast.error("Erro ao anexar mídia ao exercício");
    }
  };

  const updateAttachment = async (
    attachmentId: string,
    data: { orderIndex?: number; caption?: string },
  ) => {
    try {
      const token = await getNeonAccessToken();
      await fetch(`/api/media/exercise/attachment/${attachmentId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      setAttachments((prev) => prev.map((a) => (a.id === attachmentId ? { ...a, ...data } : a)));
    } catch (error) {
      console.error("Erro ao atualizar anexo:", error);
    }
  };

  const detachMedia = async (attachmentId: string) => {
    try {
      const token = await getNeonAccessToken();
      await fetch(`/api/media/exercise/attachment/${attachmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (error) {
      console.error("Erro ao desanexar mídia:", error);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  return {
    attachments,
    loading,
    fetchAttachments,
    attachMedia,
    updateAttachment,
    detachMedia,
  };
}
