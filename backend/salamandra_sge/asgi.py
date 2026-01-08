"""
Configuração ASGI para o projeto salamandra_sge.

Expõe o executável ASGI como uma variável de nível de módulo chamada ``application``.

Para mais informações sobre este ficheiro, consulte
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'salamandra_sge.settings')

application = get_asgi_application()
