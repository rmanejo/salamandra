from django.db import models
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from salamandra_sge.accounts.permissions import IsProfessor, IsDT, IsSchoolNotBlocked
from .models import Nota, Falta, ResumoTrimestral
from .serializers import NotaSerializer, FaltaSerializer, ResumoTrimestralSerializer
from salamandra_sge.academico.models import ProfessorTurmaDisciplina, DirectorTurma
from .services import AvaliacaoService

class NotaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para professores lançarem e editarem notas.
    """
    queryset = Nota.objects.all()
    serializer_class = NotaSerializer
    permission_classes = [IsAuthenticated, IsProfessor, IsSchoolNotBlocked]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.filter(school=user.school)
        
        # Usuários administrativos/DAP vêm todas as notas da escola
        if user.role in ['ADMIN_ESCOLA', 'DAP', 'ADMINISTRATIVO']:
            return qs
            
        # Professores só veem notas das suas turmas/disciplinas atribuídas
        atribuicoes = ProfessorTurmaDisciplina.objects.filter(professor__user=user)
        turmas_ids = list(atribuicoes.values_list('turma_id', flat=True))
        disciplinas_ids = list(atribuicoes.values_list('disciplina_id', flat=True))
        
        # Adicionar disciplinas onde o professor é Delegado de Disciplina
        from salamandra_sge.academico.models import DelegadoDisciplina
        delegacoes = DelegadoDisciplina.objects.filter(professor__user=user)
        delegated_disciplinas_ids = list(delegacoes.values_list('disciplina_id', flat=True))
        
        if delegated_disciplinas_ids:
            # Se for DD, ele pode ver qualquer turma dessa disciplina na escola
            return qs.filter(
                models.Q(turma_id__in=turmas_ids, disciplina_id__in=disciplinas_ids) |
                models.Q(disciplina_id__in=delegated_disciplinas_ids)
            )
        
        return qs.filter(turma_id__in=turmas_ids, disciplina_id__in=disciplinas_ids)

    def perform_create(self, serializer):
        instance = serializer.save(school=self.request.user.school)
        self._update_resumo(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._update_resumo(instance)

    def _update_resumo(self, instance):
        # Update summary using service
        # Use student's current turma if possible, else the note's turma
        turma_atual = instance.aluno.turma_atual or instance.turma
        
        AvaliacaoService.update_resumo_trimestral(
            student=instance.aluno,
            discipline=instance.disciplina,
            trimester=instance.trimestre,
            year=instance.turma.ano_letivo,
            turma_context=turma_atual
        )

class ResumoTrimestralViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para visualizar os resumos trimestrais (Caderneta).
    """
    queryset = ResumoTrimestral.objects.all()
    serializer_class = ResumoTrimestralSerializer
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.filter(school=user.school)
        
        # Filtros opcionais
        turma_id = self.request.query_params.get('turma')
        disciplina_id = self.request.query_params.get('disciplina')
        aluno_id = self.request.query_params.get('aluno')
        trimestre = self.request.query_params.get('trimestre')

        if turma_id and turma_id.isdigit():
            qs = qs.filter(turma_id=turma_id)
        if disciplina_id and disciplina_id.isdigit():
            qs = qs.filter(disciplina_id=disciplina_id)
        if aluno_id and aluno_id.isdigit():
            qs = qs.filter(aluno_id=aluno_id)
        if trimestre and trimestre.isdigit():
            qs = qs.filter(trimestre=trimestre)
            
        return qs

class FaltaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de faltas (Adição de faltas pelo DT ou Professor).
    """
    queryset = Falta.objects.all()
    serializer_class = FaltaSerializer
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.filter(school=user.school)
        
        if user.role == 'PROFESSOR':
            # Se for DT, vê faltas da sua turma
            try:
                dt = DirectorTurma.objects.get(professor__user=user)
                return qs.filter(turma=dt.turma)
            except DirectorTurma.DoesNotExist:
                # Se não for DT, talvez veja apenas faltas da sua disciplina
                atribuicoes = ProfessorTurmaDisciplina.objects.filter(professor__user=user)
                turmas_ids = atribuicoes.values_list('turma_id', flat=True)
                return qs.filter(turma_id__in=turmas_ids)
                
        return qs

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)
