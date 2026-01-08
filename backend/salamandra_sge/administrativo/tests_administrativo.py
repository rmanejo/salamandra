from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import CustomUser, School, District
from salamandra_sge.academico.models import Aluno, Classe, Turma, Professor
from salamandra_sge.administrativo.models import Funcionario, AvaliacaoDesempenho

class AdministrativoTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.district = District.objects.create(name="Distrito Teste")
        self.school = School.objects.create(name="Escola Teste", district=self.district)
        
        # Usuário Administrativo
        self.admin_user = CustomUser.objects.create_user(
            email="admin@escola.com",
            password="password123",
            first_name="Admin",
            last_name="Teste",
            role="ADMINISTRATIVO",
            school=self.school
        )
        
        # Usuário DAE (para avaliar)
        self.dae_user = CustomUser.objects.create_user(
            email="dae@escola.com",
            password="password123",
            first_name="DAE",
            last_name="Teste",
            role="DAE",
            school=self.school
        )
        
        self.classe = Classe.objects.create(school=self.school, nome="10ª Classe")
        self.turma = Turma.objects.create(school=self.school, nome="A", classe=self.classe, ano_letivo=2026)
        
        self.client.force_authenticate(user=self.admin_user)

    def test_inscrever_aluno(self):
        url = reverse('aluno-list')
        data = {
            "nome_completo": "Aluno Novo",
            "data_nascimento": "2010-01-01",
            "classe_atual": self.classe.id,
            "turma_atual": self.turma.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Aluno.objects.filter(nome_completo="Aluno Novo").exists())

    def test_listar_alunos_por_classe(self):
        Aluno.objects.create(nome_completo="Aluno 1", data_nascimento="2010-01-01", school=self.school, classe_atual=self.classe)
        url = reverse('aluno-list') + f"?classe_id={self.classe.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_mover_turma(self):
        aluno = Aluno.objects.create(nome_completo="Aluno 1", data_nascimento="2010-01-01", school=self.school, classe_atual=self.classe, turma_atual=self.turma)
        turma2 = Turma.objects.create(school=self.school, nome="B", classe=self.classe, ano_letivo=2026)
        
        url = reverse('aluno-mover-turma', kwargs={'pk': aluno.id})
        data = {"nova_turma_id": turma2.id}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        aluno.refresh_from_db()
        self.assertEqual(aluno.turma_atual, turma2)

    def test_cadastrar_funcionario(self):
        user_func = CustomUser.objects.create_user(email="func@escola.com", password="pwd", first_name="F", last_name="L", role="ADMINISTRATIVO")
        url = reverse('funcionario-list')
        data = {
            "user": user_func.id,
            "cargo": "Secretário",
            "sector": "SECRETARIA"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_avaliacao_desempenho_permissao(self):
        # Admin não pode criar avaliação, apenas DAE
        user_func = CustomUser.objects.create_user(email="func2@escola.com", password="pwd", first_name="F", last_name="L", role="ADMINISTRATIVO")
        func = Funcionario.objects.create(user=user_func, school=self.school, cargo="Apoio")
        
        url = reverse('avaliacao-desempenho-list')
        data = {
            "funcionario": func.id,
            "data_avaliacao": "2026-01-08",
            "pontuacao": 90
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Com DAE funciona
        self.client.force_authenticate(user=self.dae_user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_visualizar_pauta(self):
        url = reverse('relatorio-pauta-turma') + f"?turma_id={self.turma.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('pauta', response.data)
