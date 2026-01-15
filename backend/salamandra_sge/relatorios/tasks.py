import uuid

from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.cache import cache

from .services import ReportService
from . import xlsx as report_xlsx


REPORT_BUILDERS = {
    "pauta_turma": lambda user, params: report_xlsx.pauta_turma_xlsx(
        ReportService.pauta_turma(
            user=user,
            turma_id=params.get("turma_id"),
            disciplina_id=params.get("disciplina_id"),
        )
    ),
    "pauta_turma_geral": lambda user, params: report_xlsx.pauta_turma_geral_xlsx(
        ReportService.pauta_turma_geral(
            user=user,
            turma_id=params.get("turma_id"),
            trimestre=params.get("trimestre"),
        )
    ),
    "declaracao_aluno": lambda user, params: report_xlsx.declaracao_aluno_xlsx(
        ReportService.declaracao_aluno(
            user=user,
            aluno_id=params.get("aluno_id"),
        )
    ),
    "situacao_academica": lambda user, params: report_xlsx.situacao_academica_xlsx(
        ReportService.situacao_academica(
            user=user,
            aluno_id=params.get("aluno_id"),
        )
    ),
    "lista_alunos_turma": lambda user, params: report_xlsx.lista_alunos_turma_xlsx(
        ReportService.lista_alunos_turma(
            user=user,
            turma_id=params.get("turma_id"),
        )
    ),
    "aprovados_reprovados_turma": lambda user, params: report_xlsx.aprovados_reprovados_turma_xlsx(
        ReportService.aprovados_reprovados_turma(
            user=user,
            turma_id=params.get("turma_id"),
            trimestre=params.get("trimestre"),
        )
    ),
    "caderneta": lambda user, params: report_xlsx.caderneta_xlsx(
        ReportService.caderneta(
            user=user,
            turma_id=params.get("turma_id"),
            disciplina_id=params.get("disciplina_id"),
            ano_letivo=params.get("ano_letivo"),
        )
    ),
}


def build_cache_key():
    return f"relatorio:xlsx:{uuid.uuid4().hex}"


@shared_task
def gerar_relatorio_xlsx(tipo, user_id, params, cache_key, ttl=3600):
    if tipo not in REPORT_BUILDERS:
        raise ValueError("Tipo de relatório inválido.")

    user = get_user_model().objects.get(id=user_id)
    content = REPORT_BUILDERS[tipo](user, params or {})
    cache.set(cache_key, content, timeout=ttl)
    return {"cache_key": cache_key}
