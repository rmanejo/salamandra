from django.db import models
from core.models import School

class DetalheEscola(models.Model):
    """
    Armazena detalhes operacionais e infraestrutura de uma escola.
    """
    school = models.OneToOneField(School, on_delete=models.CASCADE, primary_key=True, related_name='detalhes')
    endereco = models.TextField(blank=True)
    contacto = models.CharField(max_length=50, blank=True)
    email_institucional = models.EmailField(blank=True)
    
    # Níveis de ensino oferecidos
    ensino_primario = models.BooleanField(default=False)
    ensino_secundario_geral = models.BooleanField(default=False)
    ensino_tecnico_profissional = models.BooleanField(default=False)
    
    infraestrutura_info = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Detalhe da Escola"
        verbose_name_plural = "Detalhes das Escolas"

    def __str__(self):
        return f"Detalhes de {self.school.name}"
