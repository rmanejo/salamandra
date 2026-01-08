from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolViewSet, DetalheEscolaViewSet, DirectorViewSet

router = DefaultRouter()
router.register(r'escolas', SchoolViewSet, basename='escola')
router.register(r'detalhes', DetalheEscolaViewSet, basename='detalhe-escola')
router.register(r'director', DirectorViewSet, basename='director')

app_name = 'instituicoes'

urlpatterns = [
    path('', include(router.urls)),
]
