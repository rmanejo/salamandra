from django.db import models
from core.models import School
# Nota: Importamos via string para evitar imports circulares se necessário,
# mas aqui usaremos o caminho completo das apps.
from salamandra_sge.academico.models import Aluno, Turma, Disciplina

class Nota(models.Model):
    """Representa uma avaliação quantitativa de um aluno."""
    TIPOS_AVALIACAO = [
        ('ACS1', 'ACS 1'),
        ('ACS2', 'ACS 2'),
        ('ACS3', 'ACS 3'),
        ('MAP', 'Avaliação Prática (MAP)'),
        ('ACP', 'Avaliação Contínua Parcial (ACP)'),
    ]
    TRIMESTRE_CHOICES = [
        (1, '1º Trimestre'),
        (2, '2º Trimestre'),
        (3, '3º Trimestre'),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE)
    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE, related_name='notas')
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE)
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE)
    
    tipo = models.CharField(max_length=10, choices=TIPOS_AVALIACAO)
    trimestre = models.IntegerField(choices=TRIMESTRE_CHOICES, default=1)
    valor = models.DecimalField(max_digits=4, decimal_places=2)
    data_lancamento = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Nota"
        verbose_name_plural = "Notas"

    def __str__(self):
        return f"{self.aluno} - {self.disciplina}: {self.valor}"


class ResumoTrimestral(models.Model):
    """
    Armazena os cálculos agregados (MACS, MT, Classificação)
    para um aluno em uma disciplina num trimestre.
    """
    TRIMESTRE_CHOICES = [
        (1, '1º Trimestre'),
        (2, '2º Trimestre'),
        (3, '3º Trimestre'),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE)
    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE, related_name='resumos_trimestrais')
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE)
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE, help_text="Turma onde o aluno obteve a nota")
    ano_letivo = models.IntegerField()
    trimestre = models.IntegerField(choices=TRIMESTRE_CHOICES)
    
    macs = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, verbose_name="Média ACS")
    mt = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, verbose_name="Média Trimestral")
    com = models.CharField(max_length=50, blank=True, null=True, verbose_name="Classificação/Observação")

    class Meta:
        verbose_name = "Resumo Trimestral"
        verbose_name_plural = "Resumos Trimestrais"
        unique_together = ('school', 'aluno', 'disciplina', 'ano_letivo', 'trimestre')

    def __str__(self):
        return f"{self.aluno} - {self.disciplina} (Trimestre {self.trimestre}): MT={self.mt}"

class Falta(models.Model):
    """Representa uma falta (ausência) de um aluno."""
    TIPO_FALTA = [
        ('JUSTIFICADA', 'Justificada'),
        ('INJUSTIFICADA', 'Injustificada'),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE)
    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE, related_name='faltas')
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE)
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE, null=True, blank=True)
    
    data = models.DateField()
    tipo = models.CharField(max_length=20, choices=TIPO_FALTA, default='INJUSTIFICADA')
    observacao = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Falta"
        verbose_name_plural = "Faltas"

    def __str__(self):
        return f"Falta de {self.aluno} em {self.data} ({self.tipo})"
