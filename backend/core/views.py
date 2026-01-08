from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAuthenticated
from .models import District
from .serializers import DistrictSerializer
from salamandra_sge.accounts.permissions import IsAdminSistema

class DistrictViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de Distritos.
    - Apenas ADMIN_SISTEMA pode criar, editar e deletar distritos.
    """
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Apenas ADMIN_SISTEMA pode modificar distritos
            return [IsAuthenticated(), IsAdminSistema()]
        # Qualquer usuário autenticado pode listar e ver distritos
        return [IsAuthenticated()]
