from django.db import models
from django.conf import settings
from core.models import School

class Funcionario(models.Model):
    """Representa um funcionário não docente (administrativo)."""
    PROVIMENTO_CHOICES = [
        ('PROVISORIO', 'Provisório'),
        ('DEFINITIVO', 'Definitivo'),
    ]
    SECTOR_CHOICES = [
        ('SECRETARIA', 'Secretaria'),
        ('RH', 'Recursos Humanos'),
        ('APOIO', 'Apoio Administrativo'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='administrativo_profile')
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='funcionarios')
    
    anos_servico = models.PositiveIntegerField(default=0)
    tipo_provimento = models.CharField(max_length=20, choices=PROVIMENTO_CHOICES, default='PROVISORIO')
    cargo = models.CharField(max_length=100)
    sector = models.CharField(max_length=50, choices=SECTOR_CHOICES, null=True, blank=True)

    class Meta:
        verbose_name = "Funcionário"
        verbose_name_plural = "Funcionários"

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.email} - {self.get_sector_display()} ({self.cargo})"

class AvaliacaoDesempenho(models.Model):
    """Representa uma avaliação de desempenho de um funcionário."""
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE, related_name='avaliacoes_desempenho')
    avaliador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='avaliacoes_realizadas')
    
    data_avaliacao = models.DateField()
    pontuacao = models.PositiveIntegerField(help_text="Pontuação de 1 a 10 ou 1 a 100")
    comentarios = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Avaliação de Desempenho"
        verbose_name_plural = "Avaliações de Desempenho"

    def __str__(self):
        return f"Avaliação de {self.funcionario} em {self.data_avaliacao}"
