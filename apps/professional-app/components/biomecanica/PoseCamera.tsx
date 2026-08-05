/**
 * Câmera com detecção de pose on-device (ML Kit Pose via frame processor).
 *
 * O módulo nativo pode simplesmente não existir: Expo Go, simulador, build sem
 * o pod / sem o autolinking do Android. Nesse caso o `require` abaixo lança —
 * `VisionCameraProxy.initFrameProcessorPlugin` é chamado no escopo de módulo do
 * plugin e joga `FrameProcessorsUnavailableError` quando as bindings JSI não
 * foram instaladas. Por isso o carregamento é tardio e dentro de try/catch: se
 * falhar, este componente vira a `<Camera>` pura do vision-camera e a captura
 * segue sem landmarks — o `useBiomechanicsCapture` já trata `frames.length === 0`
 * mandando o vídeo para análise em nuvem.
 *
 * API REAL do plugin (lida em node_modules, não inventada):
 *   <Camera callback={(pose) => {}} options={{ mode, performanceMode }} ...CameraProps />
 * O `callback` recebe um objeto plano com chaves `<nome>Position` -> `{ x, y }`
 * em PIXELS da imagem já rotacionada para cima, sem `z` e sem confiança. Quando
 * nenhuma pose é detectada o objeto vem vazio.
 */

import { forwardRef, useCallback, useMemo, useRef, type ComponentType } from "react";
import { Camera as VisionCamera, type CameraProps } from "react-native-vision-camera";
import type { MlKitLandmark } from "@fisioflow/core";
import { isFeatureAvailable } from "@/utils/environment";

/** Ponto cru do plugin. */
interface PluginPoint {
  x: number;
  y: number;
}

/** Objeto que o `callback` do plugin entrega por frame. */
type PluginPose = Record<string, PluginPoint | undefined>;

interface PluginCameraProps extends CameraProps {
  callback: (pose: PluginPose) => void;
  options: { mode?: "stream" | "single"; performanceMode?: "min" | "max" };
  // React 19: `ref` é prop comum, e o plugin usa `forwardRef<any>`.
  ref?: unknown;
}

/**
 * Chaves do plugin na ordem canônica BlazePose de 33 pontos usada por
 * `LANDMARK_NAMES` em `@fisioflow/core`. A posição no array É o índice do
 * landmark — `fromMlKitPose` é posicional. Errar a ordem aqui troca o joelho
 * pelo cotovelo em todo o laudo, silenciosamente.
 */
const PLUGIN_KEYS: readonly string[] = [
  "nosePosition",
  "leftEyeInnerPosition",
  "leftEyePosition",
  "leftEyeOuterPosition",
  "rightEyeInnerPosition",
  "rightEyePosition",
  "rightEyeOuterPosition",
  "leftEarPosition",
  "rightEarPosition",
  "leftMouthPosition",
  "rightMouthPosition",
  "leftShoulderPosition",
  "rightShoulderPosition",
  "leftElbowPosition",
  "rightElbowPosition",
  "leftWristPosition",
  "rightWristPosition",
  "leftPinkyPosition",
  "rightPinkyPosition",
  "leftIndexPosition",
  "rightIndexPosition",
  "leftThumbPosition",
  "rightThumbPosition",
  "leftHipPosition",
  "rightHipPosition",
  "leftKneePosition",
  "rightKneePosition",
  "leftAnklePosition",
  "rightAnklePosition",
  "leftHeelPosition",
  "rightHeelPosition",
  "leftFootIndexPosition",
  "rightFootIndexPosition",
];

let PluginCamera: ComponentType<PluginCameraProps> | null = null;
let loadError: string | null = null;

if (isFeatureAvailable("poseDetection")) {
  try {
    // Carregamento tardio: o import estático derrubaria o bundle inteiro em
    // qualquer ambiente sem o módulo nativo.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@scottjgilroy/react-native-vision-camera-v4-pose-detection") as {
      Camera?: ComponentType<PluginCameraProps>;
    };
    PluginCamera = mod?.Camera ?? null;
    if (!PluginCamera) loadError = "O plugin de pose não exportou um componente de câmera.";
  } catch (error) {
    PluginCamera = null;
    loadError = error instanceof Error ? error.message : String(error);
  }
} else {
  loadError = "Detecção de pose indisponível neste ambiente (Expo Go ou build sem o módulo).";
}

/** true quando o detector on-device está realmente carregado. */
export const poseDetectionAvailable = PluginCamera !== null;

/** Motivo da indisponibilidade, para log/diagnóstico. `null` quando disponível. */
export const poseDetectionError = loadError;

/** Só o que a tela de captura precisa da câmera — vale para os dois caminhos. */
export type PoseCameraHandle = Pick<VisionCamera, "startRecording" | "stopRecording">;

export interface PoseCameraProps extends CameraProps {
  /**
   * Recebe os 33 pontos já normalizados em 0–1, na ordem BlazePose.
   * Chamada a ~30 Hz: o destino tem que acumular em ref, nunca em estado.
   */
  onPose?: (points: ReadonlyArray<MlKitLandmark | null>, timestampMs?: number) => void;
  /** Quantos pontos vieram no último frame. Emitida no máximo a cada 500 ms. */
  onDetectionCountChange?: (count: number) => void;
  /** Largura da imagem já rotacionada para cima, em pixels. */
  sourceWidth: number;
  /** Altura da imagem já rotacionada para cima, em pixels. */
  sourceHeight: number;
  /** Desliga o detector mesmo quando ele está disponível. */
  poseEnabled?: boolean;
}

const EMIT_INTERVAL_MS = 500;

function normalize(
  pose: PluginPose,
  sourceWidth: number,
  sourceHeight: number,
): { points: (MlKitLandmark | null)[]; detected: number } {
  const points: (MlKitLandmark | null)[] = new Array(PLUGIN_KEYS.length).fill(null);
  let detected = 0;

  for (let i = 0; i < PLUGIN_KEYS.length; i++) {
    const p = pose[PLUGIN_KEYS[i]];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    // O Android grava 0/0 quando o ponto não foi encontrado, em vez de omitir.
    if (p.x === 0 && p.y === 0) continue;
    points[i] = {
      x: p.x / sourceWidth,
      y: p.y / sourceHeight,
      z: 0,
      // O plugin não devolve `inFrameLikelihood`; o iOS já filtra em 0,5 e o
      // Android não filtra. Sem o número real, marcar 1 seria mentir sobre a
      // confiança — 0,5 é o piso que sabemos ter sido respeitado.
      inFrameLikelihood: 0.5,
    };
    detected++;
  }

  return { points, detected };
}

export const PoseCamera = forwardRef<PoseCameraHandle, PoseCameraProps>(function PoseCamera(
  { onPose, onDetectionCountChange, sourceWidth, sourceHeight, poseEnabled = true, ...cameraProps },
  ref,
) {
  // O `useRunOnJS` do plugin declara deps `[]`, ou seja, congela o `callback`
  // do primeiro render. O handler precisa ser estável e ler tudo de refs.
  const onPoseRef = useRef(onPose);
  onPoseRef.current = onPose;
  const onCountRef = useRef(onDetectionCountChange);
  onCountRef.current = onDetectionCountChange;
  const spaceRef = useRef({ sourceWidth, sourceHeight });
  spaceRef.current = { sourceWidth, sourceHeight };
  const lastEmitRef = useRef(0);

  const handlePose = useCallback((pose: PluginPose) => {
    const now = Date.now();
    const { sourceWidth: w, sourceHeight: h } = spaceRef.current;
    const { points, detected } = normalize(pose, w || 1, h || 1);

    if (detected > 0) onPoseRef.current?.(points, now);

    if (now - lastEmitRef.current >= EMIT_INTERVAL_MS) {
      lastEmitRef.current = now;
      onCountRef.current?.(detected);
    }
  }, []);

  // A escolha entre plugin e câmera pura é congelada na montagem: trocar o tipo
  // do componente no meio do caminho remontaria a câmera e mataria a gravação.
  const usePlugin = useRef(poseDetectionAvailable && poseEnabled && !!onPose).current;
  const options = useMemo(
    () => ({ mode: "stream" as const, performanceMode: "max" as const }),
    [],
  );

  if (usePlugin && PluginCamera) {
    return <PluginCamera ref={ref} callback={handlePose} options={options} {...cameraProps} />;
  }

  return <VisionCamera ref={ref as never} {...cameraProps} />;
});
