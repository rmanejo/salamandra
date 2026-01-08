from decimal import Decimal
from django.db.models import Avg

class AvaliacaoService:
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
            return Decimal('0.00')
        
        return sum(values) / len(values)

    @staticmethod
    def calculate_mt(macs, acp_valor):
        """
        Calcula a Média Trimestral: (2 * MACS + ACP) / 3
        """
        return (2 * macs + acp_valor) / 3

    @staticmethod
    def get_comportamento(mt):
        """
        Retorna o rótulo de comportamento baseado na Média Trimestral.
        Formula: =SE(MT<=9,4;"NS";SE(MT<=13,4;"S";SE(MT<=16,4;"B";SE(MT<=18,4;"MB";SE(MT<=20;"E";""))))))
        """
        if mt <= 9.4:
            return "NS" # Não Satisfatório
        elif mt <= 13.4:
            return "S"  # Satisfatório
        elif mt <= 16.4:
            return "B"  # Bom
        elif mt <= 18.4:
            return "MB" # Muito Bom
        elif mt <= 20.0:
            return "E"  # Excelente
        return ""

    @staticmethod
    def calculate_mfd(mt1, mt2, mt3):
        """
        Calcula a Média Final da Disciplina (Média dos MTs).
        """
        mts = [mt for mt in [mt1, mt2, mt3] if mt is not None]
        if not mts:
            return 0
        return sum(mts) / len(mts)
