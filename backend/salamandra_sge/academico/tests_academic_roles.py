from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import CustomUser, School, District
from salamandra_sge.academico.models import Aluno, Classe, Turma, Disciplina, Professor, DirectorTurma, CoordenadorClasse, DelegadoDisciplina, ProfessorTurmaDisciplina
from salamandra_sge.avaliacoes.models import Nota

class AcademicRolesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.district = District.objects.create(name="Distrito Teste")
        self.school = School.objects.create(name="Escola Teste", district=self.district)
        
        # Criar Professor
        self.prof_user = CustomUser.objects.create_user(
            email="prof@escola.com", password="password123", role="PROFESSOR", school=self.school
        )
        self.professor = Professor.objects.create(user=self.prof_user, school=self.school)
        
        self.classe = Classe.objects.create(school=self.school, nome="10ª Classe")
        self.turma = Turma.objects.create(school=self.school, nome="A", classe=self.classe, ano_letivo=2026)
        self.disc = Disciplina.objects.create(school=self.school, nome="Matemática")
        
        # Atribuição pedagógica
        ProfessorTurmaDisciplina.objects.create(
            school=self.school, professor=self.professor, turma=self.turma, disciplina=self.disc
        )
        
        self.aluno = Aluno.objects.create(
            nome_completo="Aluno Teste", data_nascimento="2010-01-01", 
            school=self.school, classe_atual=self.classe, turma_atual=self.turma
        )

    def test_professor_lancamento_nota(self):
        self.client.force_authenticate(user=self.prof_user)
        url = reverse('avaliacoes:nota-list')
        data = {
            "aluno": self.aluno.id,
            "turma": self.turma.id,
            "disciplina": self.disc.id,
            "tipo": "ACS",
            "valor": 15.0
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Nota.objects.count(), 1)

    def test_dt_acesso_estatisticas(self):
        # Tornar professor DT
        DirectorTurma.objects.create(school=self.school, professor=self.professor, turma=self.turma, ano_letivo=2026)
        
        self.client.force_authenticate(user=self.prof_user)
        url = reverse('director-turma-minha-turma')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('estatisticas', response.data)

    def test_cc_inscricao_aluno(self):
        # Tornar professor CC
        CoordenadorClasse.objects.create(school=self.school, professor=self.professor, classe=self.classe, ano_letivo=2026)
        
        self.client.force_authenticate(user=self.prof_user)
        url = reverse('coordenador-classe-inscrever-aluno')
        data = {
            "nome_completo": "Novo Aluno CC",
            "data_nascimento": "2011-05-05",
            "classe_atual": self.classe.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Aluno.objects.filter(nome_completo="Novo Aluno CC").count(), 1)

    def test_dd_resumo_disciplina(self):
        # Tornar professor DD
        DelegadoDisciplina.objects.create(school=self.school, professor=self.professor, disciplina=self.disc, ano_letivo=2026)
        
        self.client.force_authenticate(user=self.prof_user)
        url = reverse('delegado-disciplina-resumo-disciplina')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['disciplina'], self.disc.nome)
