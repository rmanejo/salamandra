from rest_framework import permissions

class IsAdminSistema(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN_SISTEMA'

class IsAdminEscola(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN_ESCOLA', 'ADMIN_SISTEMA']

class IsDAP(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['DAP', 'DAE']

class IsDAE(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['DAE', 'DAP']

class IsSDEJT(permissions.BasePermission):
    """Permissão para funcionários do Serviço Distrital (Nível 1)."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['SDEJT_RAP', 'SDEJT_REG']

class IsProfessor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'PROFESSOR'

class IsAdministrativo(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMINISTRATIVO'

class IsSchoolNotBlocked(permissions.BasePermission):
    """
    Permite apenas leitura se a escola estiver bloqueada.
    Cargos de direção (Admin Escola, DAE, etc.) podem ignorar o bloqueio 
    para certas ações, ou o bloqueio impede tudo exceto GET.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        # Admins do sistema sempre passam
        if request.user.role == 'ADMIN_SISTEMA':
            return True
            
        school = request.user.school
        if not school:
            return True # Sem escola, não há bloqueio escolar a aplicar
            
        if not school.blocked:
            return True
            
        # Se a escola está bloqueada:
        # 1. Director da Escola e Admin do Sistema podem fazer tudo (para desbloquear e gerir)
        if request.user.role in ['ADMIN_ESCOLA', 'ADMIN_SISTEMA']:
            return True
            
        # 2. Outros só podem fazer GET (Visualizar)
        if request.method in permissions.SAFE_METHODS:
            return True
            
        return False

class IsDT(permissions.BasePermission):
    """Permite se o professor for Director de Turma (DT)."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated or request.user.role != 'PROFESSOR':
            return False
        from salamandra_sge.academico.models import DirectorTurma
        return DirectorTurma.objects.filter(professor__user=request.user).exists()

class IsCC(permissions.BasePermission):
    """Permite se o professor for Coordenador de Classe (CC)."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated or request.user.role != 'PROFESSOR':
            return False
        from salamandra_sge.academico.models import CoordenadorClasse
        return CoordenadorClasse.objects.filter(professor__user=request.user).exists()

class IsDD(permissions.BasePermission):
    """Permite se o professor for Delegado de Disciplina (DD)."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated or request.user.role != 'PROFESSOR':
            return False
        from salamandra_sge.academico.models import DelegadoDisciplina
        return DelegadoDisciplina.objects.filter(professor__user=request.user).exists()
