from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import School, DetalheEscola 
from .serializers import SchoolCreateWithUsersSerializer, SchoolSerializer, DetalheEscolaSerializer
from salamandra_sge.accounts.permissions import (
    IsSDEJT, IsAdminSistema, IsAdminEscola, IsDAP, IsDAE, IsAdministrativo, IsSchoolNotBlocked
)

class SchoolViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de Escolas.
    - ADMIN_SISTEMA: Vê e gere todas as escolas.
    - SDEJT (RAP/REG): Vê e gere apenas as escolas do seu distrito.
    """
    queryset = School.objects.all()
    
    def get_serializer_class(self):
        # Usar SchoolCreateWithUsersSerializer apenas para criar
        if self.action == 'create':
            return SchoolCreateWithUsersSerializer
        # Usar SchoolSerializer para list, retrieve, update, partial_update
        return SchoolSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            # Apenas SDEJT ou Admin Sistema podem criar escolas
            return [permissions.IsAuthenticated(), (IsSDEJT | IsAdminSistema)()]
        if self.action in ['update', 'partial_update', 'destroy']:
            # Apenas ADMIN_SISTEMA pode editar/deletar escolas
            return [permissions.IsAuthenticated(), IsAdminSistema()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN_SISTEMA':
            return School.objects.all()
        if user.role in ['SDEJT_RAP', 'SDEJT_REG']:
            return School.objects.filter(district=user.district)
        # Utilizadores de escola veem apenas a sua própria escola
        if user.school:
            return School.objects.filter(id=user.school.id)
        return School.objects.none()

    def perform_create(self, serializer):
        # Se for um SDEJT, forçamos o distrito da escola a ser o distrito do utilizador
        user = self.request.user
        if user.role in ['SDEJT_RAP', 'SDEJT_REG']:
            serializer.save(district=user.district)
        else:
            serializer.save()

class DetalheEscolaViewSet(viewsets.ModelViewSet):
    queryset = DetalheEscola.objects.all()
    serializer_class = SchoolSerializer # Precisamos de um DetalheSerializer na verdade, mas vamos usar o que temos ou criar um simples

class DirectorViewSet(viewsets.ViewSet):
    """
    ViewSet para o Director da Escola realizar operações de gestão e dashboard.
    """
    permission_classes = [IsAuthenticated, IsAdminEscola | IsDAP | IsDAE | IsAdministrativo, IsSchoolNotBlocked]

    @action(detail=False, methods=['post'])
    def bloquear_escola(self, request):
        school = request.user.school
        bloquear = request.data.get('bloquear', not school.blocked)
        school.blocked = bloquear
        school.save()
        status_msg = "bloqueada" if bloquear else "desbloqueada"
        return Response({"status": "success", "message": f"Escola {status_msg} com sucesso.", "blocked": school.blocked})

    @action(detail=False, methods=['get'])
    def get_disciplinas(self, request):
        from salamandra_sge.academico.models import Disciplina
        from salamandra_sge.academico.serializers import DisciplinaSerializer
        disciplinas = Disciplina.objects.filter(school=request.user.school)
        serializer = DisciplinaSerializer(disciplinas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        school = request.user.school
        from salamandra_sge.academico.models import Aluno, Professor, Turma, Disciplina
        from salamandra_sge.administrativo.models import Funcionario
        from salamandra_sge.avaliacoes.models import Nota
        from django.db.models import Avg

        total_alunos = Aluno.objects.filter(school=school, ativo=True).count()
        total_professores = Professor.objects.filter(school=school).count()
        total_tecnicos = Funcionario.objects.filter(school=school).count()
        
        # Aproveitamento por classe (Percentagem de Aprovados >= 10)
        estatisticas_classes = []
        classes = school.classes.all()
        for cl in classes:
            notas_classe = Nota.objects.filter(school=school, aluno__classe_atual=cl)
            total_notas = notas_classe.count()
            aprovados = notas_classe.filter(valor__gte=10).count()
            percentagem = (aprovados / total_notas * 100) if total_notas > 0 else 0
            
            estatisticas_classes.append({
                "classe": cl.nome,
                "media": float(percentagem)
            })

        # Aproveitamento por disciplina (Percentagem de Aprovados >= 10)
        estatisticas_disciplinas = []
        disciplinas = school.disciplinas.all()
        for disc in disciplinas:
            notas_disc = Nota.objects.filter(school=school, disciplina=disc)
            total_notas = notas_disc.count()
            aprovados = notas_disc.filter(valor__gte=10).count()
            percentagem = (aprovados / total_notas * 100) if total_notas > 0 else 0

            estatisticas_disciplinas.append({
                "disciplina": disc.nome,
                "media": float(percentagem)
            })

        # Aproveitamento Global da Escola (% de alunos com média >= 10)
        alunos_ativos = Aluno.objects.filter(school=school, ativo=True)
        total_alunos_escola = alunos_ativos.count()
        aprovados_escola = 0
        for aluno in alunos_ativos:
            media_aluno = Nota.objects.filter(aluno=aluno).aggregate(Avg('valor'))['valor__avg']
            if media_aluno and media_aluno >= 10:
                aprovados_escola += 1
        
        aproveitamento_global = (aprovados_escola / total_alunos_escola * 100) if total_alunos_escola > 0 else 0

        return Response({
            "total_alunos": total_alunos,
            "total_professores": total_professores,
            "total_tecnicos": total_tecnicos,
            "aproveitamento_global": float(aproveitamento_global),
            "aproveitamento_por_classe": estatisticas_classes,
            "aproveitamento_por_disciplina": estatisticas_disciplinas
        })
