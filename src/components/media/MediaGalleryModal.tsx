"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Folder,
  Plus,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Upload,
  MoreVertical,
  Check,
  Trash2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "../ui/custom-modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { useMediaGallery, MediaItem } from "@/hooks/useMediaGallery";
import { cn } from "@/lib/utils";
import { OptimizedImage } from "../ui/OptimizedImage";
import { FileUpload } from "../ui/file-upload";
import { toast } from "sonner";

interface MediaGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaItem) => void;
  initialFolder?: string;
  allowedTypes?: ("image" | "video" | "youtube")[];
}

export function MediaGalleryModal({
  open,
  onOpenChange,
  onSelect,
  initialFolder = "Exercícios",
  allowedTypes = ["image", "video", "youtube"],
}: MediaGalleryModalProps) {
  const { media, folders, loading, fetchGallery, fetchFolders, saveToGallery, deleteFromGallery } =
    useMediaGallery();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState(initialFolder);
  const [activeTab, setActiveTab] = useState<"gallery" | "upload" | "youtube">("gallery");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");

  useEffect(() => {
    if (open) {
      fetchGallery({ folder: activeFolder });
      fetchFolders();
    }
  }, [open, activeFolder, fetchGallery, fetchFolders]);

  const filteredMedia = media.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl) return;
    try {
      await saveToGallery({
        name: youtubeTitle || "Vídeo do YouTube",
        type: "youtube",
        url: youtubeUrl,
        folder: activeFolder,
        metadata: { provider: "youtube" },
      });
      setYoutubeUrl("");
      setYoutubeTitle("");
      setActiveTab("gallery");
      toast.success("Vídeo adicionado à galeria");
    } catch (error) {
      toast.error("Erro ao adicionar vídeo");
    }
  };

  const handleUploadSuccess = async (files: any[]) => {
    for (const file of files) {
      const type = file.name.match(/\.(mp4|webm|mov)$/i) ? "video" : "image";
      await saveToGallery({
        name: file.name,
        type: type as any,
        url: file.publicUrl,
        thumbnailUrl: type === "image" ? file.publicUrl : null,
        folder: activeFolder,
        size: file.size,
        metadata: { provider: "r2" },
      });
    }
    setActiveTab("gallery");
    toast.success("Upload concluído com sucesso");
  };

  return (
    <CustomModal
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-5xl"
      contentClassName="h-[80vh]"
    >
      <CustomModalHeader onClose={() => onOpenChange(false)}>
        <CustomModalTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Galeria de Mídia
        </CustomModalTitle>
      </CustomModalHeader>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Pastas */}
        <div className="w-64 border-r bg-slate-50/50 p-4 dark:bg-slate-900/50">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pastas</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100%-2rem)]">
            <div className="space-y-1">
              {[
                "Geral",
                "Exercícios",
                "Avaliações",
                ...folders.filter((f) => !["Geral", "Exercícios", "Avaliações"].includes(f)),
              ].map((folder) => (
                <button
                  key={folder}
                  onClick={() => setActiveFolder(folder)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    activeFolder === folder
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
                  )}
                >
                  <Folder
                    className={cn("h-4 w-4", activeFolder === folder ? "fill-primary/20" : "")}
                  />
                  {folder}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
          <div className="border-b p-4">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <div className="flex items-center justify-between gap-4">
                <TabsList className="grid w-[400px] grid-cols-3">
                  <TabsTrigger value="gallery">Galeria</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                  <TabsTrigger value="youtube">YouTube</TabsTrigger>
                </TabsList>

                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar mídia..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <TabsContent value="gallery" className="mt-4 flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(80vh-12rem)] px-4 pb-4">
                  {loading ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                        />
                      ))}
                    </div>
                  ) : filteredMedia.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {filteredMedia.map((item) => (
                        <div
                          key={item.id}
                          className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border bg-slate-50 transition-all hover:ring-2 hover:ring-primary dark:bg-slate-900"
                          onClick={() => onSelect(item)}
                        >
                          {item.type === "image" ? (
                            <OptimizedImage
                              src={item.url}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : item.type === "youtube" ? (
                            <div className="flex h-full w-full flex-col items-center justify-center p-4">
                              <VideoIcon className="h-10 w-10 text-red-500" />
                              <span className="mt-2 text-[10px] font-medium text-slate-500 line-clamp-1">
                                YouTube
                              </span>
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-900">
                              <VideoIcon className="h-10 w-10 text-white/50" />
                            </div>
                          )}

                          {/* Overlay Info */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                            <p className="text-[10px] font-medium text-white line-clamp-1">
                              {item.name}
                            </p>
                          </div>

                          {/* Actions */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFromGallery(item.id);
                            }}
                            className="absolute right-2 top-2 rounded-md bg-white/90 p-1 text-slate-400 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100 dark:bg-slate-800/90"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="mb-2 h-10 w-10 opacity-20" />
                      <p>Nenhuma mídia encontrada</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="upload" className="mt-4 p-4">
                <div className="rounded-xl border-2 border-dashed p-10 text-center">
                  <FileUpload
                    onUploadSuccess={handleUploadSuccess}
                    multiple
                    accept={{
                      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
                      "video/*": [".mp4", ".webm", ".mov"],
                    }}
                    placeholder="Selecione imagens ou vídeos para sua galeria"
                  />
                </div>
              </TabsContent>

              <TabsContent value="youtube" className="mt-4 p-8">
                <div className="mx-auto max-w-md space-y-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 rounded-full bg-red-100 p-4 text-red-600">
                      <VideoIcon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold">Adicionar vídeo do YouTube</h3>
                    <p className="text-sm text-slate-500">
                      Insira o link do vídeo para indexá-lo em sua biblioteca
                    </p>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-500">
                        URL do Vídeo
                      </label>
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-500">
                        Título (Opcional)
                      </label>
                      <Input
                        placeholder="Ex: Exercício de Mobilidade"
                        value={youtubeTitle}
                        onChange={(e) => setYoutubeTitle(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" disabled={!youtubeUrl} onClick={handleYoutubeSubmit}>
                      Adicionar à Biblioteca
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </CustomModal>
  );
}
