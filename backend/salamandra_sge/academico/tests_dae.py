from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import CustomUser, School, District
from .models import Professor, Classe, Turma, Disciplina, DirectorTurma, CoordenadorClasse, DelegadoDisciplina

class DAETests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.district = District.objects.create(name="Distrito Teste")
        self.school = School.objects.create(name="Escola Teste", district=self.district)
        
        # Usuário DAE
        self.dae_user = CustomUser.objects.create_user(
            email="dae@escola.com",
            password="password123",
            first_name="DAE",
            last_name="Teste",
            role="DAE",
            school=self.school
        )
        
        # Usuário Professor
        self.prof_user = CustomUser.objects.create_user(
            email="prof@escola.com",
            password="password123",
            first_name="Prof",
            last_name="Teste",
            role="PROFESSOR",
            school=self.school
        )
        self.professor = Professor.objects.create(user=self.prof_user, school=self.school)
        
        self.classe = Classe.objects.create(school=self.school, nome="10ª Classe")
        self.turma = Turma.objects.create(school=self.school, nome="A", classe=self.classe, ano_letivo=2026)
        self.disciplina = Disciplina.objects.create(school=self.school, nome="Matemática")
        
        self.client.force_authenticate(user=self.dae_user)

    def test_atribuir_cargo_dt(self):
        url = reverse('dae-atribuir-cargo')
        data = {
            "professor_id": self.professor.id,
            "cargo_tipo": "DT",
            "entidade_id": self.turma.id,
            "ano_letivo": 2026
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(DirectorTurma.objects.filter(professor=self.professor, turma=self.turma).exists())

    def test_atribuir_cargo_cc(self):
        url = reverse('dae-atribuir-cargo')
        data = {
            "professor_id": self.professor.id,
            "cargo_tipo": "CC",
            "entidade_id": self.classe.id,
            "ano_letivo": 2026
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(CoordenadorClasse.objects.filter(professor=self.professor, classe=self.classe).exists())

    def test_atribuir_cargo_dd(self):
        url = reverse('dae-atribuir-cargo')
        data = {
            "professor_id": self.professor.id,
            "cargo_tipo": "DD",
            "entidade_id": self.disciplina.id,
            "ano_letivo": 2026
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(DelegadoDisciplina.objects.filter(professor=self.professor, disciplina=self.disciplina).exists())

    def test_estatisticas_alunos(self):
        url = reverse('dae-estatisticas-alunos')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_alunos', response.data)

    def test_permissao_negada_professor(self):
        self.client.force_authenticate(user=self.prof_user)
        url = reverse('dae-estatisticas-alunos')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
