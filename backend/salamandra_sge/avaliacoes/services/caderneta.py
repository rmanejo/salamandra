from decimal import Decimal, ROUND_HALF_UP

from salamandra_sge.avaliacoes.models import Nota, ResumoTrimestral


TIPOS_NOTA = ("ACS1", "ACS2", "ACS3", "MAP", "ACP")


def arredondar_media(valor):
    if valor is None:
        return None
    return int(Decimal(valor).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def arredondar_decimal(valor):
    if valor is None:
        return None
    return Decimal(valor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calcular_com(mt):
    if mt is None:
        return None
    if mt < 0 or mt > 20:
        return None
    if mt <= 9:
        return "NS"
    if mt <= 13:
        return "S"
    if mt <= 16:
        return "B"
    if mt <= 18:
        return "MB"
    return "E"


def recalcular_resumo_trimestral(school, aluno, turma, disciplina, ano_letivo, trimestre):
    notas = Nota.objects.filter(
        school=school,
        aluno=aluno,
        turma=turma,
        disciplina=disciplina,
        ano_letivo=ano_letivo,
        trimestre=trimestre,
    )

    valores = {tipo: None for tipo in TIPOS_NOTA}
    for nota in notas:
        valores[nota.tipo] = nota.valor

    macs_base = [
        valores["ACS1"],
        valores["ACS2"],
        valores["ACS3"],
        valores["MAP"],
    ]
    macs_vals = [v for v in macs_base if v is not None]
    macs = None
    if macs_vals:
        macs = arredondar_decimal(Decimal(sum(macs_vals)) / Decimal(len(macs_vals)))

    mt = None
    if macs is not None and valores["ACP"] is not None:
        mt = arredondar_media((Decimal(macs) * 2 + Decimal(valores["ACP"])) / Decimal(3))

    com = calcular_com(mt)

    resumo, _ = ResumoTrimestral.objects.update_or_create(
        school=school,
        aluno=aluno,
        disciplina=disciplina,
        ano_letivo=ano_letivo,
        trimestre=trimestre,
        defaults={
            "turma": turma,
            "macs": macs,
            "mt": Decimal(mt) if mt is not None else None,
            "com": com,
        },
    )
    return resumo
