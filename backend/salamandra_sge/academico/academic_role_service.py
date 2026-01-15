from django.db.models import Avg
from .models import Aluno, Turma, Disciplina, ProfessorTurmaDisciplina
from salamandra_sge.avaliacoes.models import Nota, ResumoTrimestral
from salamandra_sge.avaliacoes.services import AvaliacaoService
from salamandra_sge.relatorios.services import ReportService

class AcademicRoleService:
    @staticmethod
    def _get_turma_aprovacao_stats(turma, trimestre=None):
        alunos = list(Aluno.objects.filter(turma_atual=turma, ativo=True))
        total_alunos = len(alunos)
        total_homens = sum(1 for a in alunos if a.sexo == 'HOMEM')
        total_mulheres = sum(1 for a in alunos if a.sexo == 'MULHER')

        disciplina_ids = list(
            ProfessorTurmaDisciplina.objects.filter(turma=turma)
            .values_list('disciplina_id', flat=True)
            .distinct()
        )

        resumo_filter = ResumoTrimestral.objects.filter(
            turma=turma,
            ano_letivo=turma.ano_letivo,
            disciplina_id__in=disciplina_ids,
            aluno__in=alunos
        )
        if trimestre:
            resumo_filter = resumo_filter.filter(trimestre=int(trimestre))
        resumos = resumo_filter
        resumo_map = {(r.aluno_id, r.disciplina_id, r.trimestre): r for r in resumos}

        aprovados = 0
        pendentes = 0
        aprovados_homens = 0
        aprovados_mulheres = 0
        pendentes_homens = 0
        pendentes_mulheres = 0

        for aluno in alunos:
            medias = []
            for disc_id in disciplina_ids:
                if trimestre:
                    mt = resumo_map.get((aluno.id, disc_id, int(trimestre)))
                    medias.append(int(mt.mt) if mt and mt.mt is not None else None)
                    continue
                mt1 = resumo_map.get((aluno.id, disc_id, 1))
                mt2 = resumo_map.get((aluno.id, disc_id, 2))
                mt3 = resumo_map.get((aluno.id, disc_id, 3))
                if not (mt1 and mt2 and mt3):
                    medias.append(None)
                    continue
                mfd = AvaliacaoService.calculate_mfd(mt1.mt, mt2.mt, mt3.mt)
                medias.append(float(mfd) if mfd is not None else None)

            situacao = ReportService._situacao_aprovacao(aluno, medias)
            if situacao == "Aprovado":
                aprovados += 1
                if aluno.sexo == 'HOMEM':
                    aprovados_homens += 1
                elif aluno.sexo == 'MULHER':
                    aprovados_mulheres += 1
            elif situacao == "Pendente":
                pendentes += 1
                if aluno.sexo == 'HOMEM':
                    pendentes_homens += 1
                elif aluno.sexo == 'MULHER':
                    pendentes_mulheres += 1

        reprovados = total_alunos - aprovados - pendentes
        reprovados_homens = total_homens - aprovados_homens - pendentes_homens
        reprovados_mulheres = total_mulheres - aprovados_mulheres - pendentes_mulheres
        percentagem_aprovacao = {
            "total": (aprovados / total_alunos * 100) if total_alunos > 0 else 0,
            "homens": (aprovados_homens / total_homens * 100) if total_homens > 0 else 0,
            "mulheres": (aprovados_mulheres / total_mulheres * 100) if total_mulheres > 0 else 0,
        }

        return {
            "total_alunos": total_alunos,
            "homens": total_homens,
            "mulheres": total_mulheres,
            "aprovados": {
                "total": aprovados,
                "homens": aprovados_homens,
                "mulheres": aprovados_mulheres,
            },
            "pendentes": {
                "total": pendentes,
                "homens": pendentes_homens,
                "mulheres": pendentes_mulheres,
            },
            "reprovados": {
                "total": reprovados,
                "homens": reprovados_homens,
                "mulheres": reprovados_mulheres,
            },
            "percentagem_aprovacao": percentagem_aprovacao,
        }

    @staticmethod
    def get_turma_stats(turma, trimestre=None):
        """
        Retorna estatísticas de aproveitamento por sexo, pauta completa e totais.
        """
        return AcademicRoleService._get_turma_aprovacao_stats(turma, trimestre=trimestre)

    @staticmethod
    def get_classe_stats(classe, school):
        """
        Estatísticas por classe: aproveitamento por turma e global.
        """
        turmas = Turma.objects.filter(classe=classe, school=school)
        stats_turmas = []
        total_alunos_classe = 0
        total_aprovados_classe = 0
        total_pendentes_classe = 0
        percentagens_turmas = []

        for turma in turmas:
            t_stats = AcademicRoleService.get_turma_stats(turma)
            stats_turmas.append({
                "turma": turma.nome,
                "stats": t_stats
            })
            total_alunos_classe += t_stats['total_alunos']
            total_aprovados_classe += t_stats['aprovados']['total']
            total_pendentes_classe += t_stats.get('pendentes', {}).get('total', 0)
            if t_stats['total_alunos'] > 0:
                percentagens_turmas.append((t_stats['aprovados']['total'] / t_stats['total_alunos']) * 100)
            else:
                percentagens_turmas.append(0)
            
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

        percentagem_aprovacao = (sum(percentagens_turmas) / len(percentagens_turmas)) if percentagens_turmas else 0
        media_global = (total_media_disciplinas / count_disciplinas) if count_disciplinas > 0 else 0

        return {
            "classe": classe.nome,
            "total_turmas": turmas.count(),
            "total_alunos": total_alunos_classe,
            "pendentes": total_pendentes_classe,
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
