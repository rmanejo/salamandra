from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlunoViewSet, ProfessorViewSet, DAEViewSet, TurmaViewSet, DisciplinaViewSet, RelatorioViewSet, DirectorTurmaViewSet, CoordenadorClasseViewSet, DelegadoDisciplinaViewSet, ClasseViewSet

router = DefaultRouter()
router.register(r'alunos', AlunoViewSet, basename='aluno')
router.register(r'professores', ProfessorViewSet, basename='professor')
router.register(r'dae', DAEViewSet, basename='dae')
router.register(r'turmas', TurmaViewSet, basename='turma')
router.register(r'disciplinas', DisciplinaViewSet, basename='disciplina')
router.register(r'director-turma', DirectorTurmaViewSet, basename='director-turma')
router.register(r'coordenador-classe', CoordenadorClasseViewSet, basename='coordenador-classe')
router.register(r'delegado-disciplina', DelegadoDisciplinaViewSet, basename='delegado-disciplina')
router.register(r'classes', ClasseViewSet, basename='classe')
router.register(r'relatorios', RelatorioViewSet, basename='relatorio')

urlpatterns = [
    path('', include(router.urls)),
]
