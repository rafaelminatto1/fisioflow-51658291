FROM python:3.10-slim

WORKDIR /app

# Copia dependências e instala
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código
COPY . .

# Variável de ambiente para porta (Padrão Cloud Run: 8080)
ENV PORT=8080

# Comando de inicialização
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app