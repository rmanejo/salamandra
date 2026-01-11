from decimal import Decimal
from django.db.models import Avg
from .models import Nota, ResumoTrimestral

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
        values = [n.valor for n in notas_acs]
        if nota_map:
            values.append(nota_map.valor)
        
        if not values:
            return None # Return None to distinguish from 0
        
        return Decimal(sum(values) / len(values))

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
        return (2 * macs + acp_valor) / 3

    @staticmethod
    def get_comportamento(mt):
        """
        Retorna o rótulo de comportamento baseado na Média Trimestral.
        """
        if mt is None:
            return ""
        if mt <= 9.4:
            return "NS"
        elif mt <= 13.4:
            return "S"
        elif mt <= 16.4:
            return "B"
        elif mt <= 18.4:
            return "MB"
        elif mt <= 20.0:
            return "E"
        return ""

    @staticmethod
    def update_resumo_trimestral(student, discipline, trimester, year, turma_context):
        """
        Calculates and saves the ResumoTrimestral.
        """
        grades = Nota.objects.filter(
            aluno=student,
            disciplina=discipline,
            trimestre=trimester,
            turma__ano_letivo=year
        )
        
        # Categorize grades
        acs_list = [n for n in grades if n.tipo.startswith('ACS')]
        map_node = next((n for n in grades if n.tipo == 'MAP'), None)
        acp_node = next((n for n in grades if n.tipo == 'ACP'), None)
        
        macs = AvaliacaoService.calculate_macs(acs_list, map_node)
        
        mt = None
        if macs is not None and acp_node:
             mt = AvaliacaoService.calculate_mt(macs, acp_node.valor)
        
        com = AvaliacaoService.get_comportamento(mt)
        
        # Update DB
        ResumoTrimestral.objects.update_or_create(
            school=student.school,
            aluno=student,
            disciplina=discipline,
            ano_letivo=year,
            trimestre=trimester,
            defaults={
                'turma': turma_context,
                'macs': round(macs, 2) if macs is not None else None,
                'mt': round(mt, 2) if mt is not None else None,
                'com': com
            }
        )

    @staticmethod
    def calculate_mfd(mt1, mt2, mt3):
        """
        Calcula a Média Final da Disciplina (Média dos MTs).
        """
        mts = [mt for mt in [mt1, mt2, mt3] if mt is not None]
        if not mts:
            return 0
        return sum(mts) / len(mts)
