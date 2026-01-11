from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotaViewSet, FaltaViewSet, ResumoTrimestralViewSet

router = DefaultRouter()
router.register(r'notas', NotaViewSet, basename='nota')
router.register(r'resumos', ResumoTrimestralViewSet, basename='resumo')
router.register(r'faltas', FaltaViewSet, basename='falta')

app_name = 'avaliacoes'

urlpatterns = [
    path('', include(router.urls)),
]
