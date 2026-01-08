import os
from celery import Celery

# Define o módulo de configurações padrão do Django para o programa 'celery'.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'salamandra_sge.settings')

app = Celery('salamandra_sge')

# Usar uma string aqui significa que o worker não precisa serializar
# o objeto de configuração para filhos.
# - namespace='CELERY' significa que todas as chaves de configuração relacionadas ao celery
#   devem ter um prefixo `CELERY_`.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Carrega módulos de tarefas de todos os apps Django registrados.
app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
