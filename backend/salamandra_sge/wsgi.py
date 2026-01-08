"""
Configuração WSGI para o projeto salamandra_sge.

Expõe o executável WSGI como uma variável de nível de módulo chamada ``application``.

Para mais informações sobre este ficheiro, consulte
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'salamandra_sge.settings')

application = get_wsgi_application()
