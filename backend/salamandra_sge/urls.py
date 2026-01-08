"""
Configuração de URLs para o projeto salamandra_sge.

A lista `urlpatterns` encaminha URLs para as views. Para mais informações, consulte:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Exemplos:
Views baseadas em funções
    1. Adicione um import:  from my_app import views
    2. Adicione um URL a urlpatterns:  path('', views.home, name='home')
Views baseadas em classes
    1. Adicione um import:  from other_app.views import Home
    2. Adicione um URL a urlpatterns:  path('', Home.as_view(), name='home')
Incluindo outro URLconf
    1. Importe a função include(): from django.urls import include, path
    2. Adicione um URL a urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/core/', include('core.urls', namespace='core')),
    path('api/accounts/', include('salamandra_sge.accounts.urls', namespace='accounts')),
    path('api/instituicoes/', include('salamandra_sge.instituicoes.urls', namespace='instituicoes')),
    path('api/academico/', include('salamandra_sge.academico.urls')),
    path('api/administrativo/', include('salamandra_sge.administrativo.urls', namespace='administrativo')),
    path('api/avaliacoes/', include('salamandra_sge.avaliacoes.urls', namespace='avaliacoes')),
]
