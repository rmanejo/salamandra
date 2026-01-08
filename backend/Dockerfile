# Use uma imagem Python oficial e leve
FROM python:3.11-slim

# Impede que o Python escreva ficheiros .pyc e permite logs em tempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Define o diretório de trabalho
WORKDIR /app

# Instala dependências do sistema necessárias para o psycopg2 e outras libs
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Instala as dependências do Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copia o projeto para o contentor
COPY . /app/

# Dá permissão de execução ao entrypoint (será criado a seguir)
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Porta que o Django irá expor
EXPOSE 8000

# Usa o script de entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]
