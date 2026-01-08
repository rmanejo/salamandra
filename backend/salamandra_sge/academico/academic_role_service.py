from django.db.models import Avg, Count, Q
from .models import Aluno, Turma, Classe, Disciplina, Professor, ProfessorTurmaDisciplina
from salamandra_sge.avaliacoes.models import Nota

class AcademicRoleService:
    @staticmethod
    def get_turma_stats(turma):
        """
        Retorna estatísticas de aproveitamento por sexo, pauta completa e totais.
        """
        alunos = Aluno.objects.filter(turma_atual=turma, ativo=True)
        total_alunos = alunos.count()
        total_homens = alunos.filter(sexo='HOMEM').count()
        total_mulheres = alunos.filter(sexo='MULHER').count()

        # Aproveitamento (Média > 9.5)
        # Nota: Simplificação. No sistema real depende do tipo de avaliação.
        aprovados = Aluno.objects.filter(
            turma_atual=turma, 
            ativo=True,
            notas__valor__gte=9.5
        ).distinct()
        
        stats = {
            "total_alunos": total_alunos,
            "homens": total_homens,
            "mulheres": total_mulheres,
            "aprovados": {
                "total": aprovados.count(),
                "homens": aprovados.filter(sexo='HOMEM').count(),
                "mulheres": aprovados.filter(sexo='MULHER').count(),
            },
            "reprovados": {
                "total": total_alunos - aprovados.count(),
                "homens": total_homens - aprovados.filter(sexo='HOMEM').count(),
                "mulheres": total_mulheres - aprovados.filter(sexo='MULHER').count(),
            }
        }
        return stats

    @staticmethod
    def get_classe_stats(classe, school):
        """
        Estatísticas por classe: aproveitamento por turma e global.
        """
        turmas = Turma.objects.filter(classe=classe, school=school)
        stats_turmas = []
        for turma in turmas:
            stats_turmas.append({
                "turma": turma.nome,
                "stats": AcademicRoleService.get_turma_stats(turma)
            })
            
        # Percentagem por disciplina na classe
        disciplinas = school.disciplinas.all()
        stats_disciplinas = []
        for disc in disciplinas:
            avg_disc = Nota.objects.filter(school=school, disciplina=disc, aluno__classe_atual=classe).aggregate(Avg('valor'))['valor__avg']
            stats_disciplinas.append({
                "disciplina": disc.nome,
                "media": float(avg_disc) if avg_disc else 0
            })

        return {
            "classe": classe.nome,
            "por_turma": stats_turmas,
            "por_disciplina": stats_disciplinas
        }

    @staticmethod
    def get_disciplina_stats(disciplina, school):
        """
        Estatísticas globais de uma disciplina por professor e por turma.
        """
        # Por turma
        atribuicoes = ProfessorTurmaDisciplina.objects.filter(disciplina=disciplina, school=school)
        stats_por_professor = []
        for at in atribuicoes:
            avg_grad = Nota.objects.filter(
                school=school, 
                disciplina=disciplina, 
                turma=at.turma
            ).aggregate(Avg('valor'))['valor__avg']
            
            stats_por_professor.append({
                "professor": at.professor.user.get_full_name(),
                "turma": at.turma.nome,
                "classe": at.turma.classe.nome,
                "media_aproveitamento": float(avg_grad) if avg_grad else 0
            })

        return {
            "disciplina": disciplina.nome,
            "stats": stats_por_professor
        }
