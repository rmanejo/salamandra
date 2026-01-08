from django.db import models
from django.conf import settings
from core.models import School

class Professor(models.Model):
    """Representa um professor na instituição."""
    PROVIMENTO_CHOICES = [
        ('PROVISORIO', 'Provisório'),
        ('DEFINITIVO', 'Definitivo'),
    ]
    FORMACAO_CHOICES = [
        ('N4', 'Nível 4 (N4)'),
        ('N3', 'Nível 3 (N3)'),
        ('N2', 'Nível 2 (N2)'),
        ('N1', 'Nível 1 (N1)'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='docente_profile')
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='professores')
    
    anos_servico = models.PositiveIntegerField(default=0)
    tipo_provimento = models.CharField(max_length=20, choices=PROVIMENTO_CHOICES, default='PROVISORIO')
    formacao = models.CharField(max_length=10, choices=FORMACAO_CHOICES, null=True, blank=True)
    area_formacao = models.CharField(max_length=100, null=True, blank=True, help_text="Obrigatório para N2 e N1")

    # Para Escolas Primárias (Associação com classes)
    classes_leccionadas = models.ManyToManyField('Classe', blank=True, related_name='professores_alocados')

    class Meta:
        verbose_name = "Professor"
        verbose_name_plural = "Professores"

    def __str__(self):
        return f"Prof. {self.user.get_full_name() or self.user.email} ({self.formacao})"


class Aluno(models.Model):
    """Representa um aluno matriculado."""
    SEXO_CHOICES = [
        ('HOMEM', 'Homem'),
        ('MULHER', 'Mulher'),
    ]
    SITUACAO_SOCIAL_CHOICES = [
        ('NENHUM', 'Nenhum'),
        ('ORFAO_PAI', 'Órfão de Pai'),
        ('ORFAO_MAE', 'Órfão de Mãe'),
        ('ORFAO_AMBOS', 'Órfão de Ambos'),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='alunos')
    nome_completo = models.CharField(max_length=255)
    sexo = models.CharField(max_length=10, choices=SEXO_CHOICES, null=True, blank=True)
    data_nascimento = models.DateField()
    
    naturalidade = models.CharField(max_length=100, blank=True)
    pai = models.CharField(max_length=255, blank=True)
    mae = models.CharField(max_length=255, blank=True)
    
    encarregado_educacao = models.CharField(max_length=255, null=True, blank=True)
    contacto_encarregado = models.CharField(max_length=50, blank=True)
    bairro = models.CharField(max_length=100, blank=True)
    
    situacao_social = models.CharField(
        max_length=20, 
        choices=SITUACAO_SOCIAL_CHOICES, 
        default='NENHUM'
    )
    
    classe_atual = models.ForeignKey('Classe', on_delete=models.PROTECT, related_name='alunos_matriculados', null=True)
    turma_atual = models.ForeignKey('Turma', on_delete=models.SET_NULL, related_name='alunos_na_turma', null=True, blank=True)
    ativo = models.BooleanField(default=True) # Regra: Desistência sem apagar dados

    class Meta:
        verbose_name = "Aluno"
        verbose_name_plural = "Alunos"

    def __str__(self):
        return self.nome_completo


class Classe(models.Model):
    """Representa um nível de ensino (ex: 10ª Classe)."""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='classes')
    nome = models.CharField(max_length=50)

    class Meta:
        unique_together = ('school', 'nome')

    def __str__(self):
        return self.nome


class Disciplina(models.Model):
    """Representa uma matéria de ensino."""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='disciplinas')
    nome = models.CharField(max_length=100)

    class Meta:
        unique_together = ('school', 'nome')

    def __str__(self):
        return self.nome


class Turma(models.Model):
    """Representa um agrupamento de alunos de uma classe."""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='turmas')
    nome = models.CharField(max_length=50)
    classe = models.ForeignKey(Classe, on_delete=models.CASCADE, related_name='turmas')
    ano_letivo = models.IntegerField()

    class Meta:
        unique_together = ('school', 'nome', 'classe', 'ano_letivo')

    def __str__(self):
        return f"{self.nome} - {self.classe} ({self.ano_letivo})"


class DirectorTurma(models.Model):
    """Vínculo de um professor como Director de Turma."""
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    professor = models.ForeignKey(Professor, on_delete=models.CASCADE, related_name='direccoes_turma')
    turma = models.OneToOneField('Turma', on_delete=models.CASCADE, related_name='director_turma')
    ano_letivo = models.IntegerField()

    class Meta:
        verbose_name = "Director de Turma"
        verbose_name_plural = "Directores de Turma"
        unique_together = ('professor', 'ano_letivo') # Um prof só é DT de uma turma por ano? Ou pode ser de várias? Geralmente uma.

    def __str__(self):
        return f"DT {self.professor} -> {self.turma}"


class CoordenadorClasse(models.Model):
    """Vínculo de um professor como Coordenador de Classe."""
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    professor = models.ForeignKey(Professor, on_delete=models.CASCADE, related_name='coordenacoes_classe')
    classe = models.ForeignKey('Classe', on_delete=models.CASCADE, related_name='coordenadores')
    ano_letivo = models.IntegerField()

    class Meta:
        verbose_name = "Coordenador de Classe"
        verbose_name_plural = "Coordenadores de Classe"
        unique_together = ('classe', 'school', 'ano_letivo') # Um coordenador por classe/escola/ano

    def __str__(self):
        return f"CC {self.professor} -> {self.classe}"


class DelegadoDisciplina(models.Model):
    """Vínculo de um professor como Delegado de Disciplina."""
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    professor = models.ForeignKey(Professor, on_delete=models.CASCADE, related_name='delegacoes_disciplina')
    disciplina = models.ForeignKey('Disciplina', on_delete=models.CASCADE, related_name='delegados')
    ano_letivo = models.IntegerField()

    class Meta:
        verbose_name = "Delegado de Disciplina"
        verbose_name_plural = "Delegados de Disciplina"
        unique_together = ('disciplina', 'school', 'ano_letivo')

    def __str__(self):
        return f"DD {self.professor} -> {self.disciplina}"


class ProfessorTurmaDisciplina(models.Model):
    """
    Modelo de Atribuição Pedagógica.
    Define que professor leciona qual disciplina em qual turma.
    """
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    professor = models.ForeignKey(Professor, on_delete=models.CASCADE, related_name='atribuicoes')
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE, related_name='atribuicoes')
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE, related_name='atribuicoes')

    class Meta:
        unique_together = ('turma', 'disciplina') # Uma turma só tem um professor por disciplina
        verbose_name = "Atribuição Pedagógica"
        verbose_name_plural = "Atribuições Pedagógicas"

    def __str__(self):
        return f"{self.professor} -> {self.disciplina} em {self.turma}"
