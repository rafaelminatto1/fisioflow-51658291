import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExerciseVideoLibrary } from "@/components/exercises/ExerciseVideoLibrary";
import type { ExerciseVideo } from "@/services/exerciseVideos";

interface MediaLibrarySelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  title?: string;
}

export const MediaLibrarySelectorModal: React.FC<MediaLibrarySelectorModalProps> = ({
  open,
  onOpenChange,
  onSelect,
  title = "Selecionar da Galeria",
}) => {
  const handleSelectMedia = (media: ExerciseVideo) => {
    onSelect(media.video_url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <ExerciseVideoLibrary selectionMode={true} onSelectMedia={handleSelectMedia} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
