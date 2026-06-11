import React, { useState, useRef, useCallback } from "react";
import {
  Camera,
  Video,
  FileText,
  Plus,
  Trash2,
  Play,
  Download,
  Eye,
  X,
  Upload,
  SplitSquareHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getImageServeUrl,
  type PatientPhoto,
  type PatientVideo,
  type MedicalRequest,
} from "@/api/v2/patientMedia";
import {
  usePatientPhotos,
  useUploadPatientPhoto,
  useDeletePatientPhoto,
  usePatientVideos,
  useUploadPatientVideo,
  useDeletePatientVideo,
  useMedicalRequests,
  useCreateMedicalRequest,
  useUpdateMedicalRequest,
  useDeleteMedicalRequest,
  useMediaAccessUrl,
} from "@/hooks/usePatientMedia";

// ─── Before/After comparison slider ──────────────────────────────────────────

function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = "Antes",
  afterLabel = "Depois",
}: {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [pos, setPos] = useState(50); // 0–100 percentage
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePos(e.clientX);
    },
    [updatePos],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      updatePos(e.clientX);
    },
    [updatePos],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg select-none cursor-col-resize"
      style={{ touchAction: "none" }}
    >
      {/* After (bottom layer) */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="w-full h-full object-contain block"
        draggable={false}
      />

      {/* Before (clipped overlay) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="w-full h-full object-contain block"
          draggable={false}
        />
      </div>

      {/* Drag handle */}
      <div
        className="absolute inset-y-0 z-10 flex items-center justify-center"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="w-0.5 h-full bg-card shadow-md" />
        <div className="absolute h-8 w-8 rounded-full bg-white shadow-lg border flex items-center justify-center">
          <SplitSquareHorizontal className="w-4 h-4 text-gray-700" />
        </div>
      </div>

      {/* Labels */}
      <span className="pointer-events-none absolute top-2 left-2 rounded-sm bg-black/50 px-1.5 py-0.5 text-xs font-medium text-white">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute top-2 right-2 rounded-sm bg-black/50 px-1.5 py-0.5 text-xs font-medium text-white">
        {afterLabel}
      </span>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhotoCard({ photo, onDelete }: { photo: PatientPhoto; onDelete: (id: string) => void }) {
  const [lightbox, setLightbox] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const thumbUrl = getImageServeUrl(photo.r2_key, { w: 300, h: 300, fit: "cover", q: 80 });
  const fullUrl = getImageServeUrl(photo.r2_key, { w: 1200, fit: "contain", q: 90 });

  const PHOTO_TYPE_LABELS: Record<PatientPhoto["photo_type"], string> = {
    before: "Antes",
    after: "Depois",
    progress: "Progresso",
    postural: "Postural",
    clinical: "Clínica",
    wound: "Ferida",
  };

  const PHOTO_TYPE_COLORS: Record<PatientPhoto["photo_type"], string> = {
    before: "bg-orange-100 text-orange-700",
    after: "bg-green-100 text-green-700",
    progress: "bg-blue-100 text-blue-700",
    postural: "bg-emerald-100 text-emerald-700",
    clinical: "bg-gray-100 text-gray-700",
    wound: "bg-red-100 text-red-700",
  };

  return (
    <>
      <div
        className="cv-tile group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border hover:border-primary transition-colors"
        onClick={() => setLightbox(true)}
      >
        <img
          src={thumbUrl}
          alt={photo.file_name ?? "Foto do paciente"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <Badge
          className={`absolute top-2 left-2 text-xs px-1.5 py-0.5 ${PHOTO_TYPE_COLORS[photo.photo_type]}`}
        >
          {PHOTO_TYPE_LABELS[photo.photo_type]}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-7 w-7 text-white bg-black/40 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(true);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
        {photo.notes && (
          <p className="absolute bottom-0 left-0 right-0 text-xs text-white bg-black/60 px-2 py-1 truncate">
            {photo.notes}
          </p>
        )}
      </div>

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-4xl p-2 bg-black border-0">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 text-white hover:bg-white/20"
            onClick={() => setLightbox(false)}
          >
            <X className="w-5 h-5" />
          </Button>
          <img
            src={fullUrl}
            alt={photo.file_name ?? "Foto"}
            className="w-full max-h-[80vh] object-contain rounded"
          />
          <div className="flex items-center gap-3 px-2 pb-1">
            <Badge className={`text-xs ${PHOTO_TYPE_COLORS[photo.photo_type]}`}>
              {PHOTO_TYPE_LABELS[photo.photo_type]}
            </Badge>
            {photo.body_region && (
              <span className="text-xs text-gray-400">{photo.body_region}</span>
            )}
            {photo.notes && <span className="text-xs text-gray-300 ml-auto">{photo.notes}</span>}
            <span className="text-xs text-gray-500 ml-auto">
              {format(new Date(photo.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover foto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(photo.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function VideoCard({ video, onDelete }: { video: PatientVideo; onDelete: (id: string) => void }) {
  const [playing, setPlaying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: videoUrl } = useMediaAccessUrl(video.r2_key, playing);
  const thumbUrl = video.thumbnail_r2_key
    ? getImageServeUrl(video.thumbnail_r2_key, { w: 300, h: 200, fit: "cover" })
    : null;

  const VIDEO_TYPE_LABELS: Record<PatientVideo["video_type"], string> = {
    gait: "Marcha",
    biomechanics: "Biomecânica",
    range_of_motion: "ADM",
    before: "Antes",
    after: "Depois",
    exercise: "Exercício",
    clinical: "Clínica",
  };

  const STATUS_COLORS: Record<PatientVideo["status"], string> = {
    ready: "bg-green-100 text-green-700",
    uploading: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <>
      <Card className="cv-card group relative overflow-hidden hover:shadow-md transition-shadow">
        <div
          className="relative aspect-video bg-black cursor-pointer flex items-center justify-center"
          onClick={() => setPlaying(true)}
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={video.file_name ?? "Vídeo"}
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <Video className="w-8 h-8 text-white/50" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
          {video.duration_seconds && (
            <span className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">
              {Math.floor(video.duration_seconds / 60)}:
              {String(video.duration_seconds % 60).padStart(2, "0")}
            </span>
          )}
        </div>
        <CardContent className="p-2 flex items-center gap-2">
          <Badge className={`text-xs shrink-0 ${STATUS_COLORS[video.status]}`}>
            {VIDEO_TYPE_LABELS[video.video_type]}
          </Badge>
          <span className="text-xs text-muted-foreground truncate flex-1">
            {video.file_name ?? "Vídeo"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={playing} onOpenChange={setPlaying}>
        <DialogContent className="max-w-3xl p-2 bg-black border-0">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 text-white hover:bg-white/20"
            onClick={() => setPlaying(false)}
          >
            <X className="w-5 h-5" />
          </Button>
          {videoUrl ? (
            <video controls autoPlay className="w-full max-h-[75vh] rounded" src={videoUrl}>
              Seu navegador não suporta vídeos HTML5.
            </video>
          ) : (
            <div className="flex items-center justify-center h-48 text-white/50">Carregando...</div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vídeo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(video.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MedicalRequestCard({
  req,
  onDelete,
  onStatusChange,
}: {
  req: MedicalRequest;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: MedicalRequest["status"]) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: fileUrl } = useMediaAccessUrl(req.r2_key);

  const TYPE_LABELS: Record<MedicalRequest["request_type"], string> = {
    exam_request: "Pedido de Exame",
    referral: "Encaminhamento",
    prescription: "Receita",
    certificate: "Atestado",
    other: "Outro",
  };

  const STATUS_CONFIG: Record<MedicalRequest["status"], { label: string; color: string }> = {
    pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
    scheduled: { label: "Agendado", color: "bg-blue-100 text-blue-700" },
    done: { label: "Realizado", color: "bg-green-100 text-green-700" },
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {req.title ?? TYPE_LABELS[req.request_type]}
              </p>
              <p className="text-xs text-muted-foreground">{TYPE_LABELS[req.request_type]}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Select
                value={req.status}
                onValueChange={(v) => onStatusChange(req.id, v as MedicalRequest["status"])}
              >
                <SelectTrigger
                  className={`h-6 text-xs border-0 px-2 py-0 w-auto ${STATUS_CONFIG[req.status].color}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" className="text-xs">
                    Pendente
                  </SelectItem>
                  <SelectItem value="scheduled" className="text-xs">
                    Agendado
                  </SelectItem>
                  <SelectItem value="done" className="text-xs">
                    Realizado
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {req.notes && <p className="text-xs text-muted-foreground line-clamp-2">{req.notes}</p>}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {req.request_date
                ? format(new Date(req.request_date), "dd/MM/yyyy", { locale: ptBR })
                : "—"}
            </span>
            {req.requested_by && <span className="truncate ml-2">Dr. {req.requested_by}</span>}
          </div>

          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              {req.file_name ?? "Abrir arquivo"}
            </a>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pedido?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(req.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Upload Modals ─────────────────────────────────────────────────────────────

function UploadPhotoModal({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [photoType, setPhotoType] = useState<PatientPhoto["photo_type"]>("clinical");
  const [bodyRegion, setBodyRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const upload = useUploadPatientPhoto(patientId);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    await upload.mutateAsync({
      file,
      photoType,
      metadata: { body_region: bodyRegion || null, notes: notes || null },
    });
    onOpenChange(false);
    setFile(null);
    setPreview(null);
    setBodyRegion("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Foto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg h-48 flex items-center justify-center cursor-pointer hover:bg-muted/50 relative overflow-hidden"
            onClick={() => document.getElementById("photo-file-input")?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-muted-foreground">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Clique para selecionar foto</p>
              </div>
            )}
            <input
              id="photo-file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={photoType}
              onValueChange={(v) => setPhotoType(v as PatientPhoto["photo_type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Antes</SelectItem>
                <SelectItem value="after">Depois</SelectItem>
                <SelectItem value="progress">Progresso</SelectItem>
                <SelectItem value="postural">Postural</SelectItem>
                <SelectItem value="clinical">Clínica</SelectItem>
                <SelectItem value="wound">Ferida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Região do Corpo</Label>
            <Input
              placeholder="Ex: Ombro direito, Joelho"
              value={bodyRegion}
              onChange={(e) => setBodyRegion(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              placeholder="Notas adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!file || upload.isPending}>
            {upload.isPending ? "Enviando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadVideoModal({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [videoType, setVideoType] = useState<PatientVideo["video_type"]>("clinical");
  const [notes, setNotes] = useState("");
  const upload = useUploadPatientVideo(patientId);

  const handleSubmit = async () => {
    if (!file) return;
    await upload.mutateAsync({ file, videoType, metadata: { notes: notes || null } });
    onOpenChange(false);
    setFile(null);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Vídeo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg h-32 flex items-center justify-center cursor-pointer hover:bg-muted/50"
            onClick={() => document.getElementById("video-file-input")?.click()}
          >
            <div className="text-center text-muted-foreground">
              {file ? (
                <>
                  <Video className="w-8 h-8 mx-auto mb-1 text-primary opacity-80" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Clique para selecionar vídeo (máx. 100 MB)</p>
                </>
              )}
            </div>
            <input
              id="video-file-input"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            />
          </div>

          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={videoType}
              onValueChange={(v) => setVideoType(v as PatientVideo["video_type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gait">Marcha</SelectItem>
                <SelectItem value="biomechanics">Biomecânica</SelectItem>
                <SelectItem value="range_of_motion">Amplitude de Movimento</SelectItem>
                <SelectItem value="before">Antes</SelectItem>
                <SelectItem value="after">Depois</SelectItem>
                <SelectItem value="exercise">Exercício</SelectItem>
                <SelectItem value="clinical">Clínico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              placeholder="Notas adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!file || upload.isPending}>
            {upload.isPending ? "Enviando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateMedicalRequestModal({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [requestType, setRequestType] = useState<MedicalRequest["request_type"]>("exam_request");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split("T")[0]);
  const [requestedBy, setRequestedBy] = useState("");
  const create = useCreateMedicalRequest(patientId);

  const handleSubmit = async () => {
    await create.mutateAsync({
      data: {
        request_type: requestType,
        title: title || null,
        notes: notes || null,
        request_date: requestDate || null,
        requested_by: requestedBy || null,
        status: "pending",
      },
      file: file ?? undefined,
    });
    onOpenChange(false);
    setFile(null);
    setTitle("");
    setNotes("");
    setRequestedBy("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Pedido Médico</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={requestType}
              onValueChange={(v) => setRequestType(v as MedicalRequest["request_type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exam_request">Pedido de Exame</SelectItem>
                <SelectItem value="referral">Encaminhamento</SelectItem>
                <SelectItem value="prescription">Receita</SelectItem>
                <SelectItem value="certificate">Atestado</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Título</Label>
            <Input
              placeholder="Ex: Raio-X coluna lombar"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Solicitado por</Label>
              <Input
                placeholder="Nome do médico"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              placeholder="Detalhes adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label>Arquivo (PDF, imagem)</Label>
            <div
              className="border-2 border-dashed rounded-lg h-16 flex items-center justify-center cursor-pointer hover:bg-muted/50 text-sm text-muted-foreground"
              onClick={() => document.getElementById("request-file-input")?.click()}
            >
              {file ? (
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  {file.name}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Anexar arquivo (opcional)
                </span>
              )}
              <input
                id="request-file-input"
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Gallery Component ───────────────────────────────────────────────────

interface PatientMediaGalleryProps {
  patientId: string;
}

export function PatientMediaGallery({ patientId }: PatientMediaGalleryProps) {
  const [activeSection, setActiveSection] = useState("photos");
  const [uploadPhotoOpen, setUploadPhotoOpen] = useState(false);
  const [uploadVideoOpen, setUploadVideoOpen] = useState(false);
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const { data: photos = [], isLoading: loadingPhotos } = usePatientPhotos(patientId);
  const { data: videos = [], isLoading: loadingVideos } = usePatientVideos(patientId);
  const { data: requests = [], isLoading: loadingRequests } = useMedicalRequests(patientId);

  const deletePhoto = useDeletePatientPhoto(patientId);
  const deleteVideo = useDeletePatientVideo(patientId);
  const deleteRequest = useDeleteMedicalRequest(patientId);
  const updateRequest = useUpdateMedicalRequest(patientId);

  return (
    <div className="p-4 space-y-4">
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-9">
            <TabsTrigger value="photos" className="gap-1.5 text-sm">
              <Camera className="w-3.5 h-3.5" />
              Fotos
              {photos.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-xs ml-1">
                  {photos.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5 text-sm">
              <Video className="w-3.5 h-3.5" />
              Vídeos
              {videos.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-xs ml-1">
                  {videos.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5 text-sm">
              <FileText className="w-3.5 h-3.5" />
              Pedidos
              {requests.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-xs ml-1">
                  {requests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {activeSection === "photos" && (
            <div className="flex items-center gap-2">
              {photos.some((p) => p.photo_type === "before") &&
                photos.some((p) => p.photo_type === "after") && (
                  <Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}>
                    <SplitSquareHorizontal className="w-4 h-4 mr-1" /> Comparar
                  </Button>
                )}
              <Button size="sm" onClick={() => setUploadPhotoOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Foto
              </Button>
            </div>
          )}
          {activeSection === "videos" && (
            <Button size="sm" onClick={() => setUploadVideoOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Vídeo
            </Button>
          )}
          {activeSection === "requests" && (
            <Button size="sm" onClick={() => setCreateRequestOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Pedido
            </Button>
          )}
        </div>

        {/* Photos */}
        <TabsContent value="photos">
          {loadingPhotos ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Camera className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Nenhuma foto registrada</p>
              <p className="text-sm mt-1">Adicione fotos antes/depois, posturais ou clínicas</p>
              <Button variant="outline" className="mt-4" onClick={() => setUploadPhotoOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar foto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} onDelete={(id) => deletePhoto.mutate(id)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Videos */}
        <TabsContent value="videos">
          {loadingVideos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-lg" />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Video className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Nenhum vídeo registrado</p>
              <p className="text-sm mt-1">Grave vídeos curtos de marcha, ADM ou exercícios</p>
              <Button variant="outline" className="mt-4" onClick={() => setUploadVideoOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar vídeo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} onDelete={(id) => deleteVideo.mutate(id)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Medical Requests */}
        <TabsContent value="requests">
          {loadingRequests ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Nenhum pedido registrado</p>
              <p className="text-sm mt-1">Registre pedidos de exames, encaminhamentos e receitas</p>
              <Button variant="outline" className="mt-4" onClick={() => setCreateRequestOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Novo pedido
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {requests.map((req) => (
                <MedicalRequestCard
                  key={req.id}
                  req={req}
                  onDelete={(id) => deleteRequest.mutate(id)}
                  onStatusChange={(id, status) => updateRequest.mutate({ id, data: { status } })}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <UploadPhotoModal
        patientId={patientId}
        open={uploadPhotoOpen}
        onOpenChange={setUploadPhotoOpen}
      />
      <UploadVideoModal
        patientId={patientId}
        open={uploadVideoOpen}
        onOpenChange={setUploadVideoOpen}
      />
      <CreateMedicalRequestModal
        patientId={patientId}
        open={createRequestOpen}
        onOpenChange={setCreateRequestOpen}
      />

      {/* Before/After comparison dialog */}
      {(() => {
        const beforePhotos = photos.filter((p) => p.photo_type === "before");
        const afterPhotos = photos.filter((p) => p.photo_type === "after");
        const before = beforePhotos[beforePhotos.length - 1];
        const after = afterPhotos[afterPhotos.length - 1];
        if (!before || !after) return null;
        return (
          <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
            <DialogContent className="max-w-3xl p-4" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <SplitSquareHorizontal className="w-4 h-4 text-primary" />
                  Comparação Antes / Depois
                </DialogTitle>
              </DialogHeader>
              <BeforeAfterSlider
                beforeUrl={getImageServeUrl(before.r2_key, { w: 1000, fit: "contain", q: 90 })}
                afterUrl={getImageServeUrl(after.r2_key, { w: 1000, fit: "contain", q: 90 })}
              />
              <p className="text-xs text-center text-muted-foreground pt-1">
                Arraste o divisor para comparar as fotos
              </p>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
