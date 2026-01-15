from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotaViewSet,
    FaltaViewSet,
    ResumoTrimestralViewSet,
    NotaUpsertView,
    CadernetaView,
    CadernetaXLSXView,
)

router = DefaultRouter()
router.register(r'notas', NotaViewSet, basename='nota')
router.register(r'resumos', ResumoTrimestralViewSet, basename='resumo')
router.register(r'faltas', FaltaViewSet, basename='falta')

app_name = 'avaliacoes'

urlpatterns = [
    path('notas/upsert/', NotaUpsertView.as_view(), name='nota-upsert'),
    path('caderneta/', CadernetaView.as_view(), name='caderneta'),
    path('caderneta/xlsx/', CadernetaXLSXView.as_view(), name='caderneta-xlsx'),
    path('', include(router.urls)),
]
