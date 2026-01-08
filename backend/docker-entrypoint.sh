#!/bin/bash
set -e

# Se o comando for para iniciar o Django (ou se for o padrão)
if [[ "$*" == *"runserver"* ]] || [[ "$*" == *"gunicorn"* ]] || [ -z "$1" ]; then
    echo "Aguardando base de dados..."
    sleep 5
    echo "Executando migrações..."
    python manage.py migrate --noinput
    echo "Coletando arquivos estáticos..."
    python manage.py collectstatic --noinput
fi

# Executa o comando passado para o script
if [ -n "$1" ]; then
    echo "Executando comando: $@"
    exec "$@"
fi

# Fallback para iniciar o servidor se nenhum comando for passado
if [ "$DEBUG" = "True" ]; then
    echo "Iniciando servidor de desenvolvimento Django..."
    exec python manage.py runserver 0.0.0.0:8000
else
    echo "Iniciando servidor Gunicorn..."
    exec gunicorn salamandra_sge.wsgi:application --bind 0.0.0.0:8000
fi
