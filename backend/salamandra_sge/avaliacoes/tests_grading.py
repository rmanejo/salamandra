from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import CustomUser, School, District
from salamandra_sge.academico.models import Aluno, Classe, Turma, Disciplina
from salamandra_sge.avaliacoes.models import Nota
from decimal import Decimal

class GradingSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.district = District.objects.create(name="Distrito Teste")
        self.school = School.objects.create(name="Escola Teste", district=self.district)
        self.admin = CustomUser.objects.create_user(
            email="admin@escola.com", password="password123", role="ADMIN_ESCOLA", school=self.school
        )
        self.client.force_authenticate(user=self.admin)
        
        self.classe = Classe.objects.create(school=self.school, nome="10ª Classe")
        self.turma = Turma.objects.create(school=self.school, nome="A", classe=self.classe, ano_letivo=2026)
        self.disc = Disciplina.objects.create(school=self.school, nome="Matemática")
        
        self.aluno = Aluno.objects.create(
            nome_completo="A gledce Armando", data_nascimento="2010-01-01", 
            school=self.school, classe_atual=self.classe, turma_atual=self.turma, sexo="MULHER"
        )

    def test_trimestral_grading_logic(self):
        # Exemplo: ACS1=10.0, ACS2=9.0 -> MACS=9.5 (arredonda para 10), ACP=9.0 -> MT=10
        # 1. Post Grades for 1st Trimester
        Nota.objects.create(school=self.school, aluno=self.aluno, turma=self.turma, disciplina=self.disc, tipo='ACS1', trimestre=1, valor=10.0)
        Nota.objects.create(school=self.school, aluno=self.aluno, turma=self.turma, disciplina=self.disc, tipo='ACS2', trimestre=1, valor=9.0)
        Nota.objects.create(school=self.school, aluno=self.aluno, turma=self.turma, disciplina=self.disc, tipo='ACP', trimestre=1, valor=9.0)
        
        url = reverse('relatorio-pauta-turma')
        response = self.client.get(f"{url}?turma_id={self.turma.id}&disciplina_id={self.disc.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        aluno_data = response.data['pauta'][0]
        tri1 = aluno_data['trimesters'][1]
        
        # MACS = (10 + 9) / 2 = 9.5
        self.assertEqual(tri1['macs'], 9.5)
        # MT = (2 * 9.5 + 9) / 3 = 9.66 -> arredonda para 10
        self.assertEqual(tri1['mt'], 10)
        # COM é baseado no MT inteiro
        self.assertEqual(tri1['com'], "S")
        
    def test_comportamento_labels(self):
        from salamandra_sge.avaliacoes.services import AvaliacaoService
        self.assertEqual(AvaliacaoService.get_comportamento(9), "NS")
        self.assertEqual(AvaliacaoService.get_comportamento(10), "S")
        self.assertEqual(AvaliacaoService.get_comportamento(13), "S")
        self.assertEqual(AvaliacaoService.get_comportamento(14), "B")
        self.assertEqual(AvaliacaoService.get_comportamento(16), "B")
        self.assertEqual(AvaliacaoService.get_comportamento(17), "MB")
        self.assertEqual(AvaliacaoService.get_comportamento(20), "E")
