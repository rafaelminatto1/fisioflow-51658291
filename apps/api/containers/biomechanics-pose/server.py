"""
Extrator de pose do FisioFlow.

Recebe a URL assinada de um vídeo no R2, roda MediaPipe Pose quadro a quadro e
faz PUT do bundle `ff-pose-33-v1` numa segunda URL assinada. Depois avisa o
Worker por callback autenticado.

Fronteira deliberada: este processo NÃO calcula ângulo, ROM, valgo, simetria
nem cadência. Toda a matemática clínica vive em `packages/core` e roda no
Worker, tanto para landmarks do aparelho quanto para os daqui. Uma
implementação, uma suíte de testes — se o container calculasse por conta
própria, o mesmo vídeo poderia gerar números diferentes conforme o caminho, e
não haveria como dizer qual está certo.

O container é descartável e não guarda PHI: baixa para /tmp, processa, sobe o
resultado e apaga.

## Por que MediaPipe, e não OpenPose

A literatura é clara em que MediaPipe/BlazePose é o MENOS acurado dos
estimadores testados — Mundt et al. (Sensors 2022;23(1):78) mostram taxa de
detecção de keypoints nitidamente inferior à do OpenPose e do AlphaPose, e
Washabaugh et al. (Gait Posture 2022;97:188-95) medem quadril 3,7° com
OpenPose contra 4,6° do MoveNet Thunder.

Ainda assim ficamos com MediaPipe, por uma razão que não é técnica: OpenPose é
licenciado pela Carnegie Mellon como "ACADEMIC OR NON-PROFIT ORGANIZATION
NONCOMMERCIAL RESEARCH USE ONLY". AlphaPose tem restrição equivalente nos
modelos pré-treinados. FisioFlow é produto comercial em clínica — usar
qualquer um dos dois seria violação de licença, não otimização.

MediaPipe é Apache 2.0. As mitigações para a acurácia menor são três, e todas
já estão no sistema:

1. `model_complexity=2` (heavy), a variante mais acurada do MediaPipe.
2. O FPPA é reportado como EXCURSÃO a partir da postura inicial, nunca como
   valor absoluto — Asaeda et al. (Heliyon 2024;10(17):e36338) mediram erro de
   18,8–19,7° no absoluto com MediaPipe, mas confiabilidade adequada na
   variação. Ver `packages/core/src/biomechanics/pipeline.ts`.
3. Toda comparação entre sessões passa pela diferença mínima detectável
   (`clinicalThresholds.ts`), então o erro residual do estimador não vira
   "progresso" na tela.

Se um dia houver licença comercial de um estimador melhor, trocar é simples: o
container só precisa emitir o mesmo `ff-pose-33-v1`. A matemática clínica não
muda de lugar.
"""

import hashlib
import json
import logging
import os
import subprocess
import tempfile
import threading
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import mediapipe as mp
import numpy as np
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("pose")

PORT = int(os.environ.get("PORT", "8080"))
SCHEMA = "ff-pose-33-v1"
LANDMARK_COUNT = 33
ENGINE_NAME = "mediapipe-pose"
ENGINE_VERSION = mp.__version__

# Amostragem alvo. Acima disso o custo cresce sem ganho clínico: nenhuma
# medida de ROM ou valgo em reabilitação precisa de mais que 30 Hz.
TARGET_FPS = 30.0
# 5 min. Além disso é erro de uso, não captura de consultório.
MAX_FRAMES = 9000


def quantize(value: float) -> float:
    """4 casas ≈ 0,1 px em 1080p. Mais que isso é ruído do estimador."""
    if value is None or not np.isfinite(value):
        return 0.0
    return round(float(value), 4)


def probe_video(path: str) -> dict:
    """Metadados reais do arquivo — não confiamos no que o cliente declarou."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,avg_frame_rate,nb_frames",
            "-show_entries", "format=duration",
            "-of", "json", path,
        ],
        capture_output=True, text=True, check=True,
    )
    data = json.loads(result.stdout)
    stream = (data.get("streams") or [{}])[0]

    rate = stream.get("avg_frame_rate") or "0/1"
    try:
        num, den = rate.split("/")
        fps = float(num) / float(den) if float(den) else 0.0
    except (ValueError, ZeroDivisionError):
        fps = 0.0

    return {
        "width": int(stream.get("width") or 0),
        "height": int(stream.get("height") or 0),
        "fps": fps,
        "durationMs": int(float(data.get("format", {}).get("duration") or 0) * 1000),
    }


def extract_landmarks(video_path: str, meta: dict) -> tuple[list[dict], dict]:
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise RuntimeError("Não foi possível abrir o vídeo para leitura.")

    source_fps = meta["fps"] or capture.get(cv2.CAP_PROP_FPS) or TARGET_FPS
    # Decima para ~30 Hz mantendo o passo inteiro, para o timestamp continuar
    # ancorado no frame real do vídeo em vez de num tempo interpolado.
    step = max(1, int(round(source_fps / TARGET_FPS)))
    effective_fps = source_fps / step

    frames: list[dict] = []
    source_index = 0
    emitted = 0

    pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=2,          # o mais preciso; o custo é aceitável em 4 vCPU
        enable_segmentation=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    try:
        while emitted < MAX_FRAMES:
            ok, frame = capture.read()
            if not ok:
                break

            if source_index % step != 0:
                source_index += 1
                continue

            result = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

            flat: list[float] = []
            scores: list[float] = []

            if result.pose_landmarks:
                for landmark in result.pose_landmarks.landmark:
                    score = float(getattr(landmark, "visibility", 1.0) or 0.0)
                    flat.extend([
                        quantize(landmark.x),
                        quantize(landmark.y),
                        quantize(landmark.z),
                        quantize(score),
                    ])
                    scores.append(score)
            else:
                # Frame sem pessoa detectada entra como buraco explícito, com
                # stride fixo. O pipeline rejeita a métrica se houver buracos
                # demais — em vez de interpolar por cima e parecer medida.
                flat = [0.0] * (LANDMARK_COUNT * 4)
                scores = [0.0]

            frames.append({
                "i": emitted,
                "t": int(round((source_index / source_fps) * 1000)) if source_fps else 0,
                "k": flat,
                "c": quantize(float(np.mean(scores))),
            })

            emitted += 1
            source_index += 1
    finally:
        pose.close()
        capture.release()

    truncated = emitted >= MAX_FRAMES
    return frames, {"fps": effective_fps, "truncated": truncated}


def build_bundle(frames: list[dict], meta: dict, extraction: dict, payload: dict) -> str:
    header = {
        "schema": SCHEMA,
        "landmarkCount": LANDMARK_COUNT,
        "order": "blazepose33",
        "fps": round(extraction["fps"], 3),
        "frameCount": len(frames),
        "durationMs": meta["durationMs"],
        "view": payload.get("view", "sagittal"),
        "attempt": payload.get("attempt", 1),
        "capturedAt": payload.get("capturedAt"),
        # O vídeo no R2 já está na orientação final: o app corrigiu
        # espelhamento e rotação antes de subir. Reaplicar aqui inverteria
        # esquerda/direita de volta.
        "coordinateSpace": {
            "origin": "top-left",
            "normalized": True,
            "mirrored": False,
            "rotationDegrees": 0,
            "sourceWidth": meta["width"],
            "sourceHeight": meta["height"],
        },
        "poseEngine": {
            "name": ENGINE_NAME,
            "version": ENGINE_VERSION,
            "platform": "container",
            "mode": "video",
            "modelVariant": "heavy",
        },
        "protocolSlug": payload.get("protocolSlug"),
    }
    if extraction["truncated"]:
        header["truncated"] = True

    lines = [json.dumps(header, separators=(",", ":"))]
    lines.extend(json.dumps(frame, separators=(",", ":")) for frame in frames)
    return "\n".join(lines)


def analyze(payload: dict) -> dict:
    job_id = payload["jobId"]
    log.info("job %s: iniciando", job_id)

    with tempfile.TemporaryDirectory() as workdir:
        video_path = os.path.join(workdir, "input.mp4")

        with requests.get(payload["videoUrl"], stream=True, timeout=300) as response:
            response.raise_for_status()
            with open(video_path, "wb") as handle:
                for chunk in response.iter_content(chunk_size=1 << 20):
                    handle.write(chunk)

        meta = probe_video(video_path)
        log.info("job %s: %dx%d @ %.2ffps", job_id, meta["width"], meta["height"], meta["fps"])

        frames, extraction = extract_landmarks(video_path, meta)
        if not frames:
            raise RuntimeError("Nenhum quadro pôde ser lido do vídeo.")

        bundle = build_bundle(frames, meta, extraction, payload)
        raw = bundle.encode("utf-8")
        digest = hashlib.sha256(raw).hexdigest()

        put = requests.put(
            payload["resultPutUrl"],
            data=raw,
            headers={"Content-Type": "application/x-ndjson"},
            timeout=300,
        )
        put.raise_for_status()

    usable = sum(1 for frame in frames if frame["c"] >= 0.5)
    log.info("job %s: %d frames, %d utilizáveis", job_id, len(frames), usable)

    return {
        "status": "succeeded",
        "key": payload["resultKey"],
        "sha256": digest,
        "frameCount": len(frames),
        "fps": round(extraction["fps"], 3),
        "engine": f"{ENGINE_NAME}@{ENGINE_VERSION}/container",
        "usableFrames": usable,
        "bytes": len(raw),
    }


def notify(payload: dict, body: dict) -> None:
    """Callback com token HMAC. O container não é confiável para autenticação."""
    try:
        requests.post(
            payload["callbackUrl"],
            json=body,
            headers={"X-Pose-Callback-Token": payload["callbackToken"]},
            timeout=60,
        ).raise_for_status()
    except Exception:
        log.error("job %s: callback falhou\n%s", payload.get("jobId"), traceback.format_exc())


def run_job(payload: dict) -> None:
    try:
        result = analyze(payload)
    except Exception as error:
        log.error("job %s: falhou\n%s", payload.get("jobId"), traceback.format_exc())
        result = {"status": "failed", "error": str(error)[:500]}
    notify(payload, result)


class Handler(BaseHTTPRequestHandler):
    def _json(self, status: int, body: dict) -> None:
        raw = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):  # noqa: N802
        if self.path == "/health":
            self._json(200, {"ok": True, "engine": ENGINE_NAME, "version": ENGINE_VERSION})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):  # noqa: N802
        if self.path != "/analyze":
            self._json(404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length") or 0)
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self._json(400, {"error": "corpo inválido"})
            return

        faltando = [
            campo for campo in ("jobId", "videoUrl", "resultPutUrl", "resultKey", "callbackUrl", "callbackToken")
            if not payload.get(campo)
        ]
        if faltando:
            self._json(400, {"error": f"campos obrigatórios ausentes: {', '.join(faltando)}"})
            return

        # Responde na hora e processa em segundo plano: a extração leva de
        # dezenas de segundos a poucos minutos, muito além de qualquer timeout
        # razoável de requisição. O resultado chega pelo callback.
        threading.Thread(target=run_job, args=(payload,), daemon=True).start()
        self._json(202, {"accepted": True, "jobId": payload["jobId"]})

    def log_message(self, fmt, *args):
        log.info("%s - %s", self.address_string(), fmt % args)


if __name__ == "__main__":
    log.info("extrator de pose ouvindo em :%d (mediapipe %s)", PORT, ENGINE_VERSION)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
