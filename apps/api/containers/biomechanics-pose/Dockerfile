# Extrator de pose para reprocessamento de captura biomecânica.
#
# Este container faz UMA coisa: recebe a URL assinada de um vídeo no R2,
# extrai landmarks quadro a quadro e devolve o MESMO formato `ff-pose-33-v1`
# que o aplicativo produz. Ele NÃO calcula ângulo, ROM, valgo nem simetria —
# essa matemática vive só em `packages/core`, chamada pelo Worker, para que
# exista uma implementação clínica e uma suíte de testes, não duas.
#
# MediaPipe Pose emite exatamente os 33 pontos BlazePose na mesma ordem do
# nosso schema, então não há remapeamento de índice — e é justamente
# remapeamento errado que troca joelho esquerdo por direito em silêncio.

FROM python:3.11-slim-bookworm

# ffmpeg para decodificar; libgl/libglib são dependências nativas do OpenCV.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

# Baixa o modelo na imagem, não em runtime: um container que busca peso na
# primeira requisição transforma latência de rede em falha de análise.
RUN python -c "import mediapipe as mp; mp.solutions.pose.Pose(model_complexity=2).close()"

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["python", "server.py"]
