from django.db import models
from core.models import School
# Nota: Importamos via string para evitar imports circulares se necessário,
# mas aqui usaremos o caminho completo das apps.
from salamandra_sge.academico.models import Aluno, Turma, Disciplina

class Nota(models.Model):
    """Representa uma avaliação quantitativa de um aluno."""
    TIPOS_AVALIACAO = [
        ('ACS', 'Avaliação Contínua Sistemática'),
        ('MAP', 'Avaliação Prática'),
        ('ACP', 'Avaliação Contínua Parcial'),
        ('EXAME', 'Exame Final'),
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
