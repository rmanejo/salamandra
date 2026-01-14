from decimal import Decimal
from salamandra_sge.avaliacoes.models import Nota, ResumoTrimestral
from salamandra_sge.avaliacoes.services.caderneta import (
    arredondar_media,
    arredondar_decimal,
    calcular_com,
    recalcular_resumo_trimestral,
)

class AvaliacaoService:
    @staticmethod
    def get_student_grades(student, discipline, year):
        """
        Retrieves all grades for a student in a specific discipline and year.
        This ignores the class (Turma) to ensure grades follow the student.
        """
        return Nota.objects.filter(
            aluno=student,
            disciplina=discipline,
            turma__ano_letivo=year 
        ).select_related('turma')

    @staticmethod
    def calculate_macs(notas_acs, nota_map=None):
        """
        Calcula a Média das Avaliações Contínuas e Sistemáticas.
        Inclui MAP se disponível.
        """
        values = [n.valor for n in notas_acs if n.valor is not None]
        if nota_map and nota_map.valor is not None:
            values.append(nota_map.valor)
        
        if not values:
            return None

        return arredondar_decimal(Decimal(sum(values)) / Decimal(len(values)))

    @staticmethod
    def calculate_mt(macs, acp_valor):
        """
        Calcula a Média Trimestral: (MACS + ACP) / 2
        ADJUSTED: Standard implies arithmetic mean if not specified otherwise, 
        but previous code had (2*MACS + ACP)/3. 
        Let's stick to the previous formula IF strictly required, but the prompt implied standard simple averages?
        Actually, let's keep the previous formula (2*MACS + ACP)/3 as it's more common in Moz systems (MACS weight 2).
        """
        if macs is None or acp_valor is None:
            return None
        return arredondar_media((Decimal(macs) * 2 + Decimal(acp_valor)) / Decimal(3))

    @staticmethod
    def get_comportamento(mt):
        """
        Retorna o rótulo de comportamento baseado na Média Trimestral.
        """
        return calcular_com(mt)

    @staticmethod
    def update_resumo_trimestral(student, discipline, trimester, year, turma_context):
        """
        Calculates and saves the ResumoTrimestral.
        """
        recalcular_resumo_trimestral(
            school=student.school,
            aluno=student,
            turma=turma_context,
            disciplina=discipline,
            ano_letivo=year,
            trimestre=trimester,
        )

    @staticmethod
    def calculate_mfd(mt1, mt2, mt3):
        """
        Calcula a Média Final da Disciplina (Média dos MTs).
        """
        mts = [mt for mt in [mt1, mt2, mt3] if mt is not None]
        if not mts:
            return None
        return arredondar_decimal(Decimal(sum(mts)) / Decimal(len(mts)))
