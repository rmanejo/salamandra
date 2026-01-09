from rest_framework import viewsets, status, permissions, exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from salamandra_sge.accounts.permissions import IsAdministrativo, IsDAE, IsAdminEscola, IsSchoolNotBlocked
from .models import Funcionario, AvaliacaoDesempenho
from .serializers import FuncionarioSerializer, AvaliacaoDesempenhoSerializer, StaffRegistrationSerializer

class FuncionarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de funcionários não docentes.
    """
    queryset = Funcionario.objects.all()
    serializer_class = FuncionarioSerializer
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]
    
    def get_permissions(self):
        if self.action in ['registar', 'destroy', 'update', 'partial_update', 'create']:
            return [IsAuthenticated(), (IsAdminEscola | IsDAE | IsAdministrativo)(), IsSchoolNotBlocked()]
        return [IsAuthenticated(), IsSchoolNotBlocked()]

    def get_queryset(self):
        user = self.request.user
        if user.school:
            return self.queryset.filter(school=user.school)
        return self.queryset.none()

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsAdminEscola | IsDAE | IsAdministrativo, IsSchoolNotBlocked])
    def registar(self, request):
        """Registo unificado de funcionários e professores."""
        serializer = StaffRegistrationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "status": "success",
                "message": f"Funcionário {user.get_full_name()} registado com sucesso.",
                "user_id": user.id
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = instance.user
        data = request.data
        
        # 1. Update User fields
        if 'first_name' in data: user.first_name = data['first_name']
        if 'last_name' in data: user.last_name = data['last_name']
        if 'email' in data: user.email = data['email']
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        user.save()
        
        # 2. Update Funcionario fields
        if 'cargo' in data: instance.cargo = data['cargo']
        if 'sector' in data: instance.sector = data['sector']
        if 'tipo_provimento' in data: instance.tipo_provimento = data['tipo_provimento']
        instance.save()
        
        # 3. Update Professor profile if exists
        try:
            if hasattr(user, 'professor_profile'):
                prof = user.professor_profile
                if 'formacao' in data: prof.formacao = data['formacao']
                if 'area_formacao' in data: prof.area_formacao = data['area_formacao']
                if 'tipo_provimento' in data: prof.tipo_provimento = data['tipo_provimento']
                prof.save()
        except:
            pass
            
        return Response(self.get_serializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = instance.user
        # Deleting the user will cascade to Funcionario and Professor profiles
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

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
