from decimal import Decimal

from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound

from salamandra_sge.academico.models import (
    Aluno,
    CoordenadorClasse,
    DirectorTurma,
    Disciplina,
    ProfessorTurmaDisciplina,
    Turma,
)
from salamandra_sge.avaliacoes.models import Nota, ResumoTrimestral
from salamandra_sge.avaliacoes.services import AvaliacaoService
from salamandra_sge.avaliacoes.services.caderneta import arredondar_decimal


class ReportService:
    """
    Serviços puros para dados de relatórios (sem Request/Response).
    Centraliza validações e regras de permissão para consumo por API e exportação.
    """

    ADMIN_ROLES = ['ADMIN_ESCOLA', 'DAP', 'ADMINISTRATIVO']
    APROVACAO_MEDIA_GLOBAL_MIN = 9.5
    APROVACAO_DISCIPLINA_MIN = 8.0
    APROVACAO_DISCIPLINA_LIMITE = 9.5
    APROVACAO_MAX_NEGATIVAS = 2

    @classmethod
    def _is_report_admin(cls, user):
        return user.role in cls.ADMIN_ROLES

    @classmethod
    def _can_view_pauta(cls, user, turma):
        if cls._is_report_admin(user):
            return True
        if DirectorTurma.objects.filter(professor__user=user, turma=turma).exists():
            return True
        if CoordenadorClasse.objects.filter(
            professor__user=user,
            classe=turma.classe
        ).exists():
            return True
        if user.role != 'PROFESSOR':
            return False
        return False

    @classmethod
    def _can_view_declaracao(cls, user, aluno):
        if cls._is_report_admin(user):
            return True
        if user.role != 'PROFESSOR':
            return False
        if not aluno.turma_atual:
            return False
        return DirectorTurma.objects.filter(
            professor__user=user,
            turma=aluno.turma_atual
        ).exists()

    @classmethod
    def _can_view_caderneta(cls, user, turma, disciplina):
        if cls._is_report_admin(user):
            return True
        if user.role != 'PROFESSOR':
            return False
        if cls._can_view_pauta(user, turma):
            return True
        return ProfessorTurmaDisciplina.objects.filter(
            professor__user=user,
            turma=turma,
            disciplina=disciplina
        ).exists()

    @staticmethod
    def _require(condition, message, exc=ValidationError):
        if not condition:
            raise exc(message)

    @classmethod
    def _situacao_aprovacao(cls, aluno, medias):
        if aluno.status == 'TRANSFERIDO':
            return "Transferido"
        if aluno.status != 'ATIVO':
            return "PDF"
        if any(media is None for media in medias):
            return "Pendente"
        if not medias:
            return "Pendente"

        media_global = sum(medias) / len(medias)
        if media_global < cls.APROVACAO_MEDIA_GLOBAL_MIN:
            return "Reprovado"

        negativas = 0
        for media in medias:
            if media < cls.APROVACAO_DISCIPLINA_MIN:
                return "Reprovado"
            if media < cls.APROVACAO_DISCIPLINA_LIMITE:
                negativas += 1

        if negativas > cls.APROVACAO_MAX_NEGATIVAS:
            return "Reprovado"

        return "Aprovado"

    @staticmethod
    def _percent(part, total):
        return round((part / total) * 100, 2) if total > 0 else 0

    @classmethod
    def _build_col_stats(cls, alunos, valores_por_aluno, aprovacao_fn):
        total_alunos = len(alunos)
        total_homens = sum(1 for a in alunos if a.sexo == 'HOMEM')
        total_mulheres = sum(1 for a in alunos if a.sexo == 'MULHER')

        avaliados = 0
        avaliados_homens = 0
        avaliados_mulheres = 0
        aprovados = 0
        aprovados_homens = 0
        aprovados_mulheres = 0
        reprovados = 0
        reprovados_homens = 0
        reprovados_mulheres = 0

        for aluno in alunos:
            valor = valores_por_aluno.get(aluno.id)
            if valor is None:
                continue
            avaliados += 1
            if aluno.sexo == 'HOMEM':
                avaliados_homens += 1
            elif aluno.sexo == 'MULHER':
                avaliados_mulheres += 1

            if aprovacao_fn(valor):
                aprovados += 1
                if aluno.sexo == 'HOMEM':
                    aprovados_homens += 1
                elif aluno.sexo == 'MULHER':
                    aprovados_mulheres += 1
            else:
                reprovados += 1
                if aluno.sexo == 'HOMEM':
                    reprovados_homens += 1
                elif aluno.sexo == 'MULHER':
                    reprovados_mulheres += 1

        return {
            "inscritos": {
                "total": total_alunos,
                "homens": total_homens,
                "mulheres": total_mulheres,
                "percentagens": {
                    "total": 100.0 if total_alunos > 0 else 0,
                    "homens": cls._percent(total_homens, total_alunos),
                    "mulheres": cls._percent(total_mulheres, total_alunos),
                },
            },
            "avaliados": {
                "total": avaliados,
                "homens": avaliados_homens,
                "mulheres": avaliados_mulheres,
                "percentagens": {
                    "total": cls._percent(avaliados, total_alunos),
                    "homens": cls._percent(avaliados_homens, total_homens),
                    "mulheres": cls._percent(avaliados_mulheres, total_mulheres),
                },
            },
            "aprovados": {
                "total": aprovados,
                "homens": aprovados_homens,
                "mulheres": aprovados_mulheres,
                "percentagens": {
                    "total": cls._percent(aprovados, total_alunos),
                    "homens": cls._percent(aprovados_homens, total_homens),
                    "mulheres": cls._percent(aprovados_mulheres, total_mulheres),
                },
            },
            "reprovados": {
                "total": reprovados,
                "homens": reprovados_homens,
                "mulheres": reprovados_mulheres,
                "percentagens": {
                    "total": cls._percent(reprovados, total_alunos),
                    "homens": cls._percent(reprovados_homens, total_homens),
                    "mulheres": cls._percent(reprovados_mulheres, total_mulheres),
                },
            },
        }

    @classmethod
    def pauta_turma(cls, *, user, turma_id, disciplina_id):
        cls._require(turma_id and disciplina_id, "turma_id e disciplina_id são obrigatórios.")

        try:
            turma = Turma.objects.get(id=turma_id, school=user.school)
            disciplina = Disciplina.objects.get(id=disciplina_id, school=user.school)
        except (Turma.DoesNotExist, Disciplina.DoesNotExist):
            raise NotFound("Turma ou Disciplina não encontrada.")

        if not cls._can_view_pauta(user, turma):
            raise PermissionDenied("Sem permissão para visualizar esta pauta.")

        if not ProfessorTurmaDisciplina.objects.filter(turma=turma, disciplina=disciplina).exists():
            raise ValidationError("Disciplina não atribuída a esta turma.")

        notas = Nota.objects.filter(turma=turma, disciplina=disciplina)
        alunos = Aluno.objects.filter(turma_atual=turma, ativo=True).order_by('numero_turma', 'nome_completo')

        pauta = []
        for aluno in alunos:
            aluno_notas = notas.filter(aluno=aluno)
            tri_data = {}
            mts = []
            for tri in [1, 2, 3]:
                notas_tri = aluno_notas.filter(trimestre=tri)
                acs_list = notas_tri.filter(tipo__in=['ACS1', 'ACS2', 'ACS3']).order_by('tipo')
                map_nota = notas_tri.filter(tipo='MAP').first()
                acp_nota = notas_tri.filter(tipo='ACP').first()

                macs = AvaliacaoService.calculate_macs(acs_list, map_nota)
                mt = None
                com = None
                if acp_nota and acp_nota.valor is not None:
                    mt = AvaliacaoService.calculate_mt(macs, acp_nota.valor)
                    com = AvaliacaoService.get_comportamento(mt)

                tri_data[tri] = {
                    "acs": [float(n.valor) for n in acs_list if n.valor is not None],
                    "map": float(map_nota.valor) if map_nota else None,
                    "macs": float(macs) if macs is not None else None,
                    "acp": float(acp_nota.valor) if acp_nota else None,
                    "mt": int(mt) if mt is not None else None,
                    "com": com
                }

                if mt is not None:
                    mts.append(mt)

            mfd = AvaliacaoService.calculate_mfd(
                tri_data[1]["mt"],
                tri_data[2]["mt"],
                tri_data[3]["mt"],
            )

            pauta.append({
                "id": aluno.id,
                "numero_turma": aluno.numero_turma,
                "nome": aluno.nome_completo,
                "sexo": aluno.sexo[0] if aluno.sexo else "",
                "trimesters": tri_data,
                "mfd": float(mfd) if mfd is not None else None,
            })

        return {
            "escola": user.school.name,
            "turma": turma.nome,
            "classe": turma.classe.nome,
            "disciplina": disciplina.nome,
            "ano_letivo": turma.ano_letivo,
            "pauta": pauta,
        }

    @classmethod
    def pauta_turma_geral(cls, *, user, turma_id, trimestre):
        cls._require(turma_id and trimestre, "turma_id e trimestre são obrigatórios.")
        cls._require(str(trimestre).isdigit(), "trimestre inválido.")

        try:
            turma = Turma.objects.get(id=turma_id, school=user.school)
        except Turma.DoesNotExist:
            raise NotFound("Turma não encontrada.")

        if not cls._can_view_pauta(user, turma):
            raise PermissionDenied("Sem permissão para visualizar esta pauta.")

        disciplinas = Disciplina.objects.filter(
            id__in=ProfessorTurmaDisciplina.objects.filter(
                turma=turma, school=user.school
            ).values_list('disciplina_id', flat=True)
        ).order_by('ordem', 'nome')

        if not disciplinas.exists():
            raise ValidationError("Nenhuma disciplina atribuída a esta turma.")

        ano_letivo = turma.ano_letivo
        resumos = ResumoTrimestral.objects.filter(
            turma=turma,
            ano_letivo=ano_letivo,
            trimestre=int(trimestre)
        )
        resumo_map = {(r.aluno_id, r.disciplina_id): r for r in resumos}

        alunos = Aluno.objects.filter(turma_atual=turma).order_by('nome_completo')
        pauta = []
        valores_por_disciplina = {disc.id: {} for disc in disciplinas}
        valores_media = {}

        for aluno in alunos:
            disciplinas_data = {}
            mts = []
            pendente = False
            for disc in disciplinas:
                resumo = resumo_map.get((aluno.id, disc.id))
                mt_val = float(resumo.mt) if resumo and resumo.mt is not None else None
                disciplinas_data[disc.id] = mt_val
                valores_por_disciplina[disc.id][aluno.id] = mt_val
                if mt_val is not None:
                    mts.append(mt_val)
                else:
                    pendente = True

            media_final = (sum(mts) / len(mts)) if mts else None
            valores_media[aluno.id] = media_final
            situacao = cls._situacao_aprovacao(aluno, mts if not pendente else mts + [None])
            pauta.append({
                "id": aluno.id,
                "nome": aluno.nome_completo,
                "sexo": aluno.sexo,
                "numero_turma": aluno.numero_turma,
                "disciplinas": disciplinas_data,
                "media_final": round(media_final, 2) if media_final is not None else None,
                "situacao": situacao
            })

        estatisticas_disciplinas = []
        for disc in disciplinas:
            stats = cls._build_col_stats(
                alunos,
                valores_por_disciplina.get(disc.id, {}),
                lambda v: v >= 10
            )
            estatisticas_disciplinas.append({
                "id": disc.id,
                "nome": disc.nome,
                "stats": stats,
            })

        stats_media = cls._build_col_stats(
            alunos,
            valores_media,
            lambda v: v >= 10
        )

        return {
            "escola": user.school.name,
            "turma": turma.nome,
            "classe": turma.classe.nome,
            "ano_letivo": ano_letivo,
            "trimestre": int(trimestre),
            "disciplinas": [{"id": d.id, "nome": d.nome} for d in disciplinas],
            "pauta": pauta,
            "estatisticas": {
                "disciplinas": estatisticas_disciplinas,
                "media_final": stats_media,
            },
        }

    @classmethod
    def declaracao_aluno(cls, *, user, aluno_id):
        cls._require(aluno_id, "aluno_id é obrigatório.")

        try:
            aluno = Aluno.objects.get(id=aluno_id, school=user.school)
        except Aluno.DoesNotExist:
            raise NotFound("Aluno não encontrado.")

        if not cls._can_view_declaracao(user, aluno):
            raise PermissionDenied("Sem permissão para visualizar esta declaração.")

        turma = aluno.turma_atual
        if not turma:
            raise ValidationError("Aluno sem turma atual.")

        ano_letivo = turma.ano_letivo
        disciplinas = Disciplina.objects.filter(
            id__in=ProfessorTurmaDisciplina.objects.filter(
                turma=turma, school=user.school
            ).values_list('disciplina_id', flat=True)
        ).order_by('ordem', 'nome')

        resumos = ResumoTrimestral.objects.filter(
            aluno=aluno,
            ano_letivo=ano_letivo
        )
        resumo_map = {}
        for r in resumos:
            resumo_map[(r.disciplina_id, r.trimestre)] = r

        disciplinas_data = []
        medias_finais = []

        for disc in disciplinas:
            mt1 = resumo_map.get((disc.id, 1))
            mt2 = resumo_map.get((disc.id, 2))
            mt3 = resumo_map.get((disc.id, 3))

            mts = [
                int(mt1.mt) if mt1 and mt1.mt is not None else None,
                int(mt2.mt) if mt2 and mt2.mt is not None else None,
                int(mt3.mt) if mt3 and mt3.mt is not None else None,
            ]
            mfd = AvaliacaoService.calculate_mfd(mts[0], mts[1], mts[2])
            medias_finais.append(float(mfd) if mfd is not None else None)

            disciplinas_data.append({
                "disciplina_id": disc.id,
                "disciplina_nome": disc.nome,
                "trimestres": {
                    1: mts[0],
                    2: mts[1],
                    3: mts[2],
                },
                "mfd": float(mfd) if mfd is not None else None,
                "situacao": "Aprovado" if mfd is not None and mfd >= 10 else "Reprovado" if mfd is not None else "Sem dados"
            })

        overall_status = cls._situacao_aprovacao(aluno, medias_finais)

        return {
            "aluno": {
                "id": aluno.id,
                "nome": aluno.nome_completo,
            },
            "turma": turma.nome,
            "classe": turma.classe.nome,
            "ano_letivo": ano_letivo,
            "disciplinas": disciplinas_data,
            "situacao_final": overall_status,
        }

    @classmethod
    def situacao_academica(cls, *, user, aluno_id):
        cls._require(aluno_id, "aluno_id é obrigatório.")

        try:
            aluno = Aluno.objects.get(id=aluno_id, school=user.school)
        except Aluno.DoesNotExist:
            raise NotFound("Aluno não encontrado.")

        if not cls._can_view_declaracao(user, aluno):
            raise PermissionDenied("Sem permissão para visualizar esta situação.")

        disciplinas = Disciplina.objects.filter(school=user.school).order_by('ordem', 'nome')

        report = []
        for disc in disciplinas:
            disc_data = {
                "disciplina_id": disc.id,
                "disciplina_nome": disc.nome,
                "trimesters": {}
            }

            for tri in [1, 2, 3]:
                notas = Nota.objects.filter(aluno=aluno, disciplina=disc, trimestre=tri)
                acs_list = notas.filter(tipo__in=['ACS1', 'ACS2', 'ACS3']).order_by('tipo')
                map_nota = notas.filter(tipo='MAP').first()
                acp_nota = notas.filter(tipo='ACP').first()

                macs = AvaliacaoService.calculate_macs(acs_list, map_nota)
                mt = None
                com = None

                if acp_nota and acp_nota.valor is not None:
                    mt = AvaliacaoService.calculate_mt(macs, acp_nota.valor)
                    com = AvaliacaoService.get_comportamento(mt)

                disc_data["trimesters"][tri] = {
                    "acs": [float(n.valor) for n in acs_list if n.valor is not None],
                    "map": float(map_nota.valor) if map_nota else None,
                    "macs": float(macs) if macs is not None else None,
                    "acp": float(acp_nota.valor) if acp_nota else None,
                    "mt": int(mt) if mt is not None else None,
                    "com": com
                }

            mt1 = disc_data["trimesters"][1]["mt"]
            mt2 = disc_data["trimesters"][2]["mt"]
            mt3 = disc_data["trimesters"][3]["mt"]
            mfd = AvaliacaoService.calculate_mfd(mt1, mt2, mt3)
            disc_data["mfd"] = float(mfd) if mfd is not None else None

            report.append(disc_data)

        return {
            "aluno": {
                "id": aluno.id,
                "nome": aluno.nome_completo,
                "numero_turma": aluno.numero_turma,
            },
            "disciplinas": report,
        }

    @classmethod
    def caderneta(cls, *, user, turma_id, disciplina_id, ano_letivo):
        cls._require(turma_id and disciplina_id and ano_letivo, "turma_id, disciplina_id e ano_letivo são obrigatórios.")
        cls._require(str(ano_letivo).isdigit(), "ano_letivo inválido.")

        turma = Turma.objects.filter(id=turma_id, school=user.school).first()
        disciplina = Disciplina.objects.filter(id=disciplina_id, school=user.school).first()
        if not turma or not disciplina:
            raise NotFound("Turma ou disciplina não encontrada.")

        if not cls._can_view_caderneta(user, turma, disciplina):
            raise PermissionDenied("Sem permissão para visualizar esta caderneta.")

        alunos = list(Aluno.objects.filter(turma_atual=turma))
        alunos.sort(key=lambda a: (a.numero_turma is None, a.numero_turma or 0, a.nome_completo))

        notas = Nota.objects.filter(
            turma=turma,
            disciplina=disciplina,
            ano_letivo=int(ano_letivo),
            aluno__in=alunos
        )
        resumos = ResumoTrimestral.objects.filter(
            turma=turma,
            disciplina=disciplina,
            ano_letivo=int(ano_letivo),
            aluno__in=alunos
        )

        notas_map = {(n.aluno_id, n.trimestre, n.tipo): n.valor for n in notas}
        resumo_map = {(r.aluno_id, r.trimestre): r for r in resumos}

        rows = []
        for aluno in alunos:
            notas_payload = {}
            resumo_payload = {}
            mts = []
            for tri in [1, 2, 3]:
                notas_payload[str(tri)] = {
                    "ACS1": float(notas_map.get((aluno.id, tri, "ACS1"))) if notas_map.get((aluno.id, tri, "ACS1")) is not None else None,
                    "ACS2": float(notas_map.get((aluno.id, tri, "ACS2"))) if notas_map.get((aluno.id, tri, "ACS2")) is not None else None,
                    "ACS3": float(notas_map.get((aluno.id, tri, "ACS3"))) if notas_map.get((aluno.id, tri, "ACS3")) is not None else None,
                    "MAP": float(notas_map.get((aluno.id, tri, "MAP"))) if notas_map.get((aluno.id, tri, "MAP")) is not None else None,
                    "ACP": float(notas_map.get((aluno.id, tri, "ACP"))) if notas_map.get((aluno.id, tri, "ACP")) is not None else None,
                }

                resumo = resumo_map.get((aluno.id, tri))
                resumo_payload[str(tri)] = {
                    "macs": float(resumo.macs) if resumo and resumo.macs is not None else None,
                    "mt": int(resumo.mt) if resumo and resumo.mt is not None else None,
                    "com": resumo.com if resumo else None,
                }
                if resumo and resumo.mt is not None:
                    mts.append(int(resumo.mt))

            mfd = None
            if mts:
                mfd = float(arredondar_decimal(Decimal(sum(mts)) / Decimal(len(mts))))

            rows.append({
                "aluno_id": aluno.id,
                "numero_turma": aluno.numero_turma,
                "nome_completo": aluno.nome_completo,
                "sexo": aluno.sexo,
                "status": aluno.status,
                "notas": notas_payload,
                "resumo": resumo_payload,
                "mfd": mfd,
            })

        return {
            "turma": {"id": turma.id, "nome": turma.nome, "classe": turma.classe.nome},
            "disciplina": {"id": disciplina.id, "nome": disciplina.nome},
            "ano_letivo": int(ano_letivo),
            "rows": rows,
        }

    @classmethod
    def lista_alunos_turma(cls, *, user, turma_id):
        cls._require(turma_id, "turma_id é obrigatório.")
        try:
            turma = Turma.objects.get(id=turma_id, school=user.school)
        except Turma.DoesNotExist:
            raise NotFound("Turma não encontrada.")

        if not cls._can_view_pauta(user, turma):
            raise PermissionDenied("Sem permissão para visualizar esta turma.")

        alunos = list(Aluno.objects.filter(turma_atual=turma, ativo=True))
        alunos.sort(key=lambda a: (a.numero_turma is None, a.numero_turma or 0, a.nome_completo))

        return {
            "turma": {"id": turma.id, "nome": turma.nome, "classe": turma.classe.nome},
            "alunos": [
                {
                    "id": aluno.id,
                    "numero_turma": aluno.numero_turma,
                    "nome": aluno.nome_completo,
                    "sexo": aluno.sexo,
                    "status": aluno.status,
                }
                for aluno in alunos
            ],
        }

    @classmethod
    def aprovados_reprovados_turma(cls, *, user, turma_id, trimestre):
        pauta = cls.pauta_turma_geral(user=user, turma_id=turma_id, trimestre=trimestre)
        aprovados = []
        reprovados = []
        sem_dados = []

        for aluno in pauta["pauta"]:
            if aluno["situacao"] == "Aprovado":
                aprovados.append(aluno)
            elif aluno["situacao"] == "Reprovado":
                reprovados.append(aluno)
            else:
                sem_dados.append(aluno)

        return {
            "turma": pauta["turma"],
            "classe": pauta["classe"],
            "ano_letivo": pauta["ano_letivo"],
            "trimestre": pauta["trimestre"],
            "aprovados": aprovados,
            "reprovados": reprovados,
            "sem_dados": sem_dados,
        }
