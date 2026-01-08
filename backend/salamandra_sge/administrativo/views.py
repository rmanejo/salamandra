from rest_framework import viewsets, status, permissions, exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from salamandra_sge.accounts.permissions import IsAdministrativo, IsDAE, IsAdminEscola, IsSchoolNotBlocked
from .models import Funcionario, AvaliacaoDesempenho
from .serializers import FuncionarioSerializer, AvaliacaoDesempenhoSerializer

class FuncionarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de funcionários não docentes.
    """
    queryset = Funcionario.objects.all()
    serializer_class = FuncionarioSerializer
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get_queryset(self):
        user = self.request.user
        if user.school:
            return self.queryset.filter(school=user.school)
        return self.queryset.none()

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)

class AvaliacaoDesempenhoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para avaliações de desempenho.
    """
    queryset = AvaliacaoDesempenho.objects.all()
    serializer_class = AvaliacaoDesempenhoSerializer
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get_queryset(self):
        user = self.request.user
        if user.school:
            return self.queryset.filter(school=user.school)
        return self.queryset.none()

    def perform_create(self, serializer):
        # Apenas DAE ou AdminEscola podem avaliar
        user = self.request.user
        if user.role not in ['DAE', 'ADMIN_ESCOLA', 'DIR_ADJUNTO_PEDAGOGICO', 'DAP']:
             raise exceptions.PermissionDenied("Apenas a direção pode realizar avaliações.")
        
        serializer.save(school=user.school, avaliador=user)
