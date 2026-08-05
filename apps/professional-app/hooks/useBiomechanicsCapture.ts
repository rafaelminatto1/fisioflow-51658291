/**
 * Máquina de estados da captura biomecânica.
 *
 * Antes, `capture.tsx` chamava `completeMediaUpload` sem nunca ter chamado
 * `createUploadUrl` nem `startRecording` — nenhum byte de vídeo subia,
 * `r2_key` ficava NULL, e `qualityScore: 82` era digitado à mão. A tela
 * navegava para a análise como se tivesse gravado algo.
 *
 * Aqui o fluxo é real e cada passo é observável:
 *
 *   idle → recording → creating → uploadingVideo → uploadingLandmarks
 *        → processing → polling → ready | failed
 *
 * Os landmarks são acumulados num `useRef`, nunca em `useState`: a 30 Hz, um
 * setState por frame derruba frames e trava a UI.
 */

import { useCallback, useRef, useState } from "react";
// `uploadAsync` só existe no API legado do expo-file-system 55 — o novo
// (File/Directory/Paths) não tem primitiva de upload. Para o vídeo, que é um
// arquivo local grande, o uploader nativo é o que sobrevive ao app ir para
// segundo plano.
import * as LegacyFileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import {
  encodeBundle,
  fromMlKitPose,
  POSE_BUNDLE_SCHEMA,
  type BundleHeader,
  type CaptureView,
  type LandmarkFrame,
  type MlKitLandmark,
} from "@fisioflow/core";
import { biomechanicsApi } from "@/lib/api/biomechanics";

export type CaptureStage =
  | "idle"
  | "recording"
  | "creating"
  | "uploadingVideo"
  | "uploadingLandmarks"
  | "processing"
  | "polling"
  | "ready"
  | "failed";

/** 3 min a 30 fps — o mesmo teto que o servidor aplica. */
const MAX_FRAMES = 5400;

export interface CaptureResult {
  assessmentId: string;
  mediaId: string;
  jobId?: string;
  frameCount: number;
  /** true quando não houve pose no aparelho e a análise vai para a nuvem. */
  deferredToCloud: boolean;
}

export interface UseBiomechanicsCaptureOptions {
  patientId?: string;
  protocolId?: string;
  view: CaptureView;
  attempt?: number;
  fps?: number;
  poseEngine?: { name: string; version?: string; platform?: string };
}

export function useBiomechanicsCapture(options: UseBiomechanicsCaptureOptions) {
  const [stage, setStage] = useState<CaptureStage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
  /** Só para a UI (contador). Os frames em si ficam no ref. */
  const [frameCount, setFrameCount] = useState(0);

  const framesRef = useRef<LandmarkFrame[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const truncatedRef = useRef(false);
  const spaceRef = useRef({ mirrored: false, sourceWidth: 1920, sourceHeight: 1080 });

  const fps = options.fps ?? 30;

  /**
   * Recebe um frame do detector de pose.
   * Chamada em alta frequência — nada de setState por frame aqui além do
   * contador, que é atualizado a cada 10 frames.
   */
  const onPose = useCallback(
    (points: ReadonlyArray<MlKitLandmark | null | undefined>, timestampMs?: number) => {
      if (startedAtRef.current === null) return;
      if (framesRef.current.length >= MAX_FRAMES) {
        truncatedRef.current = true;
        return;
      }

      const now = timestampMs ?? Date.now();
      const frame = fromMlKitPose(points, {
        frameIndex: framesRef.current.length,
        timeMs: Math.max(0, Math.round(now - startedAtRef.current)),
      });

      framesRef.current.push(frame);
      if (framesRef.current.length % 10 === 0) setFrameCount(framesRef.current.length);
    },
    [],
  );

  /** Informa como o buffer da câmera estava orientado. Ver `applyCoordinateSpace`. */
  const setCoordinateSpace = useCallback(
    (space: { mirrored: boolean; sourceWidth?: number; sourceHeight?: number }) => {
      spaceRef.current = {
        mirrored: space.mirrored,
        sourceWidth: space.sourceWidth ?? spaceRef.current.sourceWidth,
        sourceHeight: space.sourceHeight ?? spaceRef.current.sourceHeight,
      };
    },
    [],
  );

  const beginRecording = useCallback(() => {
    framesRef.current = [];
    truncatedRef.current = false;
    startedAtRef.current = Date.now();
    setFrameCount(0);
    setError(null);
    setResult(null);
    setProgress(0);
    setStage("recording");
  }, []);

  const reset = useCallback(() => {
    framesRef.current = [];
    startedAtRef.current = null;
    truncatedRef.current = false;
    setFrameCount(0);
    setStage("idle");
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  /**
   * Encerra a captura e entrega tudo ao backend.
   *
   * `videoUri` pode vir da gravação ou da galeria. Sem landmarks (Expo Go,
   * simulador, plugin não linkado) o vídeo sobe assim mesmo e a análise fica
   * pendente de reprocessamento em nuvem — é o caminho que impede o Android
   * sem pose de virar beco sem saída.
   */
  const finishCapture = useCallback(
    async (input: {
      videoUri?: string;
      durationMs?: number;
      width?: number;
      height?: number;
      sizeBytes?: number;
      contentType?: string;
    }): Promise<CaptureResult> => {
      const { patientId, protocolId, view } = options;
      if (!patientId) throw new Error("Selecione um paciente antes de capturar.");

      const frames = framesRef.current;
      const capturedAt = new Date(startedAtRef.current ?? Date.now()).toISOString();
      startedAtRef.current = null;

      try {
        setStage("creating");
        setProgress(10);

        const capture = await biomechanicsApi.createCapture({
          patientId,
          protocolId,
          view,
          attempt: options.attempt ?? 1,
          mediaType: "video",
          contentType: input.contentType ?? "video/mp4",
          durationMs: input.durationMs,
          width: input.width ?? spaceRef.current.sourceWidth,
          height: input.height ?? spaceRef.current.sourceHeight,
          sizeBytes: input.sizeBytes,
          fps,
          source: "professional-app",
        });

        const assessmentId = capture.data.assessment.id;
        const mediaId = capture.data.media.id;

        // ── vídeo ────────────────────────────────────────────────────────────
        if (input.videoUri) {
          setStage("uploadingVideo");
          setProgress(30);

          const { data: videoUpload } = await biomechanicsApi.createUploadUrl(assessmentId, {
            mediaId,
            contentType: input.contentType ?? "video/mp4",
            filename: `${mediaId}.mp4`,
          });

          const videoUpload_ = await LegacyFileSystem.uploadAsync(
            videoUpload.uploadUrl,
            input.videoUri,
            {
              httpMethod: "PUT",
              uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
              headers: { "Content-Type": input.contentType ?? "video/mp4" },
            },
          );

          if (videoUpload_.status >= 300) {
            throw new Error(`Falha ao enviar o vídeo (HTTP ${videoUpload_.status}).`);
          }

          await biomechanicsApi.completeMediaUpload(assessmentId, {
            mediaId,
            durationMs: input.durationMs,
            fps,
            width: input.width,
            height: input.height,
            sizeBytes: input.sizeBytes,
            // qualityScore NÃO é enviado: quem mede a qualidade é o pipeline,
            // a partir dos frames. Antes era `82` fixo, digitado à mão.
            metadata: { uploadedFrom: Platform.OS },
          });
        }

        // ── landmarks ────────────────────────────────────────────────────────
        if (frames.length === 0) {
          setStage("ready");
          setProgress(100);
          const deferred: CaptureResult = {
            assessmentId,
            mediaId,
            frameCount: 0,
            deferredToCloud: true,
          };
          setResult(deferred);
          return deferred;
        }

        setStage("uploadingLandmarks");
        setProgress(55);

        const header: BundleHeader = {
          schema: POSE_BUNDLE_SCHEMA as "ff-pose-33-v1",
          landmarkCount: 33,
          order: "blazepose33",
          fps,
          frameCount: frames.length,
          durationMs: frames[frames.length - 1]?.timeMs ?? 0,
          view,
          attempt: options.attempt ?? 1,
          capturedAt,
          coordinateSpace: {
            origin: "top-left",
            normalized: true,
            mirrored: spaceRef.current.mirrored,
            rotationDegrees: 0,
            sourceWidth: spaceRef.current.sourceWidth,
            sourceHeight: spaceRef.current.sourceHeight,
          },
          poseEngine: options.poseEngine ?? { name: "unknown", platform: Platform.OS },
          truncated: truncatedRef.current || undefined,
        };

        const ndjson = encodeBundle(header, frames);
        const bytes = new TextEncoder().encode(ndjson).length;
        const sha256 = await sha256Hex(ndjson);

        const { data: landmarksUpload } = await biomechanicsApi.createLandmarksUploadUrl(
          assessmentId,
          { mediaId, frameCount: frames.length, attempt: options.attempt ?? 1 },
        );

        // ~270 KB de texto: PUT direto, sem passar por arquivo temporário.
        const upload = await fetch(landmarksUpload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/x-ndjson" },
          body: ndjson,
        });

        if (!upload.ok) {
          throw new Error(`Falha ao enviar os landmarks (HTTP ${upload.status}).`);
        }

        setStage("processing");
        setProgress(80);

        const complete = await biomechanicsApi.completeLandmarksUpload(assessmentId, {
          mediaId,
          sha256,
          bytes,
          schema: POSE_BUNDLE_SCHEMA,
          attempt: options.attempt ?? 1,
          header: header as unknown as Record<string, unknown>,
        });

        setStage("ready");
        setProgress(100);

        const ok: CaptureResult = {
          assessmentId,
          mediaId,
          jobId: complete.data.job?.id,
          frameCount: frames.length,
          deferredToCloud: false,
        };
        setResult(ok);
        framesRef.current = [];
        return ok;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Falha ao enviar a captura.";
        setStage("failed");
        setError(message);
        throw err;
      }
    },
    [fps, options],
  );

  return {
    stage,
    progress,
    error,
    result,
    frameCount,
    isBusy: !["idle", "ready", "failed"].includes(stage),
    onPose,
    setCoordinateSpace,
    beginRecording,
    finishCapture,
    reset,
  };
}

/** SHA-256 em hex. `expo-crypto` não cobre string longa de forma confiável aqui. */
async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
