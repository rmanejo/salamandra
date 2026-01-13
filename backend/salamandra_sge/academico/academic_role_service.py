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
        total_alunos_classe = 0
        total_aprovados_classe = 0

        for turma in turmas:
            t_stats = AcademicRoleService.get_turma_stats(turma)
            stats_turmas.append({
                "turma": turma.nome,
                "stats": t_stats
            })
            total_alunos_classe += t_stats['total_alunos']
            total_aprovados_classe += t_stats['aprovados']['total']
            
        # Percentagem por disciplina na classe
        disciplinas = school.disciplinas.all()
        stats_disciplinas = []
        total_media_disciplinas = 0
        count_disciplinas = 0

        for disc in disciplinas:
            avg_disc = Nota.objects.filter(school=school, disciplina=disc, aluno__classe_atual=classe).aggregate(Avg('valor'))['valor__avg']
            val = float(avg_disc) if avg_disc else 0
            stats_disciplinas.append({
                "disciplina": disc.nome,
                "media": val
            })
            if avg_disc:
                total_media_disciplinas += val
                count_disciplinas += 1

        percentagem_aprovacao = (total_aprovados_classe / total_alunos_classe * 100) if total_alunos_classe > 0 else 0
        media_global = (total_media_disciplinas / count_disciplinas) if count_disciplinas > 0 else 0

        return {
            "classe": classe.nome,
            "total_turmas": turmas.count(),
            "total_alunos": total_alunos_classe,
            "media_global": media_global,
            "percentagem_aprovacao": percentagem_aprovacao,
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
        
        melhor_turma_nome = "-"
        melhor_media = -1
        
        total_media_geral = 0
        count_turmas = 0

        # Para calculo de % positivas (Alunos com >= 10)
        total_alunos_avaliados = 0
        total_alunos_positivos = 0

        for at in atribuicoes:
            notas_turma = Nota.objects.filter(school=school, disciplina=disciplina, turma=at.turma)
            avg_grad = notas_turma.aggregate(Avg('valor'))['valor__avg']
            media_turma = float(avg_grad) if avg_grad else 0
            
            # Check melhor turma
            if media_turma > melhor_media:
                melhor_media = media_turma
                melhor_turma_nome = at.turma.nome

            # Aggregate for global details
            if avg_grad:
                total_media_geral += media_turma
                count_turmas += 1
            
            # Count positives
            # This is an approximation. Ideally we check student averages.
            # Counting individual grades >= 10 vs total grades for % positive grades (not students)
            positivas = notas_turma.filter(valor__gte=10).count()
            total = notas_turma.count()
            
            total_alunos_positivos += positivas
            total_alunos_avaliados += total

            stats_por_professor.append({
                "professor": at.professor.user.get_full_name(),
                "turma": at.turma.nome,
                "classe": at.turma.classe.nome,
                "media_aproveitamento": media_turma
            })
            
        media_geral = (total_media_geral / count_turmas) if count_turmas > 0 else 0
        percentagem_positivas = (total_alunos_positivos / total_alunos_avaliados * 100) if total_alunos_avaliados > 0 else 0

        return {
            "disciplina": disciplina.nome,
            "media_geral": media_geral,
            "percentagem_positivas": percentagem_positivas,
            "melhor_turma": melhor_turma_nome if melhor_media >= 0 else "-",
            "stats": stats_por_professor
        }

    @staticmethod
    def get_turma_detailed_stats(turma):
        """
        Stats detalhados para o DT:
        - Alunos por sexo e idades.
        - Lista de alunos com cargos.
        """
        alunos = Aluno.objects.filter(turma_atual=turma).order_by('numero_turma', 'nome_completo')
        total_alunos = alunos.count()
        
        # Gender breakdown
        homens = alunos.filter(sexo='HOMEM')
        mulheres = alunos.filter(sexo='MULHER')
        
        from datetime import date
        today = date.today()
        
        def calculate_age(born):
            return today.year - born.year - ((today.month, today.day) < (born.month, born.day))

        # Ages breakdown
        ages_breakdown = {}
        for a in alunos:
            age = calculate_age(a.data_nascimento)
            if age not in ages_breakdown:
                ages_breakdown[age] = {'homens': 0, 'mulheres': 0}
            if a.sexo == 'HOMEM':
                ages_breakdown[age]['homens'] += 1
            elif a.sexo == 'MULHER':
                ages_breakdown[age]['mulheres'] += 1
        
        # Student list
        lista_alunos = []
        for a in alunos:
            lista_alunos.append({
                "id": a.id,
                "numero_turma": a.numero_turma,
                "nome": a.nome_completo,
                "sexo": a.sexo,
                "data_nascimento": a.data_nascimento,
                "idade": calculate_age(a.data_nascimento),
                "cargo": a.cargo_turma if hasattr(a, 'cargo_turma') else "Nenhum",
                "contacto_encarregado": a.contacto_encarregado,
                "bairro": a.bairro,
                "pai": a.pai,
                "mae": a.mae,
                "ativo": a.ativo,
                "status": a.status
            })
            
        return {
            "turma_id": turma.id,
            "turma": turma.nome,
            "total_alunos": total_alunos,
            "total_homens": homens.count(),
            "total_mulheres": mulheres.count(),
            "idades": ages_breakdown,
            "lista_alunos": lista_alunos
        }

    @staticmethod
    def get_classe_turmas(classe, school):
        """
        Lista turmas da classe para o CC.
        """
        turmas = Turma.objects.filter(classe=classe, school=school)
        data = []
        for t in turmas:
            stats = AcademicRoleService.get_turma_stats(t)
            data.append({
                "id": t.id,
                "nome": t.nome,
                "ano_letivo": t.ano_letivo,
                "total_alunos": stats['total_alunos'],
                "media": 0, # Placeholder, calculation is expensive
                "director_turma": t.director_turma.professor.user.get_full_name() if hasattr(t, 'director_turma') else "-"
            })
        return data

    @staticmethod
    def get_disciplina_details(disciplina, school):
        """
        Detalhes da disciplina, professores e turmas para o DD.
        """
        atribuicoes = ProfessorTurmaDisciplina.objects.filter(disciplina=disciplina, school=school)
        
        # Group by teacher
        teachers_map = {}
        for at in atribuicoes:
            prof_id = at.professor.id
            if prof_id not in teachers_map:
                teachers_map[prof_id] = {
                    "id": at.professor.id,
                    "nome": at.professor.user.get_full_name(),
                    "turmas": []
                }
            teachers_map[prof_id]["turmas"].append({
                "id": at.turma.id,
                "nome": at.turma.nome,
                "classe": at.turma.classe.nome
            })
            
        return {
            "disciplina_id": disciplina.id,
            "disciplina": disciplina.nome,
            "professores": list(teachers_map.values())
        }
