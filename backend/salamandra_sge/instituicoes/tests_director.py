from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import CustomUser, School, District
from salamandra_sge.academico.models import Aluno, Classe, Turma

class DirectorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.district = District.objects.create(name="Distrito Teste")
        self.school = School.objects.create(name="Escola Teste", district=self.district)
        
        # Usuário Director
        self.director_user = CustomUser.objects.create_user(
            email="director@escola.com",
            password="password123",
            first_name="Director",
            last_name="Escola",
            role="ADMIN_ESCOLA",
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
        
        self.classe = Classe.objects.create(school=self.school, nome="10ª Classe")
        self.turma = Turma.objects.create(school=self.school, nome="A", classe=self.classe, ano_letivo=2026)
        
    def test_bloquear_desbloquear_escola(self):
        self.client.force_authenticate(user=self.director_user)
        url = reverse('instituicoes:director-bloquear-escola')
        
        # Bloquear
        response = self.client.post(url, {"bloquear": True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.school.refresh_from_db()
        self.assertTrue(self.school.blocked)
        
        # Desbloquear
        response = self.client.post(url, {"bloquear": False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.school.refresh_from_db()
        self.assertFalse(self.school.blocked)

    def test_permissao_bloqueio_professor(self):
        # Bloquear a escola
        self.school.blocked = True
        self.school.save()
        
        self.client.force_authenticate(user=self.prof_user)
        # Tentar criar uma disciplina (operacao de escrita)
        url = reverse('disciplina-list')
        data = {"nome": "Matemática"}
        response = self.client.post(url, data, format='json')
        
        # Deve retornar 403 Forbidden porque a escola está bloqueada e ele é professor
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # GET deve funcionar (visualizar)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_director(self):
        self.client.force_authenticate(user=self.director_user)
        url = reverse('instituicoes:director-dashboard')
        
        # Criar alguns dados
        Aluno.objects.create(nome_completo="Aluno 1", data_nascimento="2010-01-01", school=self.school, classe_atual=self.classe)
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_alunos'], 1)
        self.assertIn('aproveitamento_por_classe', response.data)
