from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from salamandra_sge.accounts.permissions import IsProfessor, IsDT, IsSchoolNotBlocked
from .models import Nota, Falta
from .serializers import NotaSerializer, FaltaSerializer
from salamandra_sge.academico.models import ProfessorTurmaDisciplina, DirectorTurma

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
        
        # Professores só veem notas das suas turmas/disciplinas atribuídas
        atribuicoes = ProfessorTurmaDisciplina.objects.filter(professor__user=user)
        turmas_ids = atribuicoes.values_list('turma_id', flat=True)
        disciplinas_ids = atribuicoes.values_list('disciplina_id', flat=True)
        
        return qs.filter(turma_id__in=turmas_ids, disciplina_id__in=disciplinas_ids)

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)

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
