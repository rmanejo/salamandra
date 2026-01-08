from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FuncionarioViewSet, AvaliacaoDesempenhoViewSet

router = DefaultRouter()
router.register(r'funcionarios', FuncionarioViewSet, basename='funcionario')
router.register(r'avaliacoes-desempenho', AvaliacaoDesempenhoViewSet, basename='avaliacao-desempenho')

app_name = 'administrativo'

urlpatterns = [
    path('', include(router.urls)),
]
