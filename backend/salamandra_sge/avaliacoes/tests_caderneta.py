from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from core.models import CustomUser, School, District
from salamandra_sge.academico.models import Aluno, Classe, Turma, Disciplina, Professor, ProfessorTurmaDisciplina


class CadernetaTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.district = District.objects.create(name="Distrito Teste")
        self.school = School.objects.create(name="Escola Teste", district=self.district)
        self.user = CustomUser.objects.create_user(
            email="prof@escola.com",
            password="password123",
            role="PROFESSOR",
            school=self.school,
            first_name="Prof",
            last_name="Teste",
        )
        self.professor = Professor.objects.create(user=self.user, school=self.school)
        self.client.force_authenticate(user=self.user)

        self.classe = Classe.objects.create(school=self.school, nome="10ª Classe")
        self.turma = Turma.objects.create(school=self.school, nome="A", classe=self.classe, ano_letivo=2026)
        self.disciplina = Disciplina.objects.create(school=self.school, nome="Matemática")
        self.aluno = Aluno.objects.create(
            nome_completo="Aluno Exemplo",
            data_nascimento="2010-01-01",
            school=self.school,
            classe_atual=self.classe,
            turma_atual=self.turma,
            sexo="MULHER"
        )
        ProfessorTurmaDisciplina.objects.create(
            school=self.school,
            professor=self.professor,
            turma=self.turma,
            disciplina=self.disciplina
        )

    def test_upsert_e_caderneta(self):
        url = "/api/avaliacoes/notas/upsert/"
        payload_base = {
            "aluno_id": self.aluno.id,
            "turma_id": self.turma.id,
            "disciplina_id": self.disciplina.id,
            "trimestre": 1,
        }

        response = self.client.put(url, data={**payload_base, "tipo": "ACS1", "valor": 9})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.put(url, data={**payload_base, "tipo": "ACS2", "valor": 10})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.put(url, data={**payload_base, "tipo": "ACP", "valor": 9})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        resumo = response.data["resumo"]
        self.assertEqual(resumo["macs"], 9.5)
        self.assertEqual(resumo["mt"], 10)
        self.assertEqual(resumo["com"], "S")
        self.assertEqual(resumo["mfd"], 10.0)

        response = self.client.get(
            "/api/avaliacoes/caderneta/",
            data={
                "turma_id": self.turma.id,
                "disciplina_id": self.disciplina.id,
                "ano_letivo": self.turma.ano_letivo,
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data["rows"][0]
        self.assertEqual(row["mfd"], 10.0)
        self.assertEqual(row["resumo"]["1"]["mt"], 10)
