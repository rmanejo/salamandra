from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('O Email deve ser definido')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class District(models.Model):
    """Representa um distrito geográfico."""
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class School(models.Model):
    """Representa uma instituição de ensino (escola)."""
    SCHOOL_TYPE_CHOICES = [
        ('PRIMARIA', 'Ensino Primário (1ª-6ª Classe)'),
        ('SECUNDARIA_1', 'Ensino Secundário - 1º Ciclo (7ª-9ª Classe)'),
        ('SECUNDARIA_2', 'Ensino Secundário - 2º Ciclo (10ª-12ª Classe)'),
        ('SECUNDARIA_COMPLETA', 'Ensino Secundário Completo (7ª-12ª Classe)'),
    ]
    TRIMESTRE_CHOICES = [
        (1, '1º Trimestre'),
        (2, '2º Trimestre'),
        (3, '3º Trimestre'),
    ]

    name = models.CharField(max_length=100)
    district = models.ForeignKey(District, related_name='schools', on_delete=models.CASCADE)
    school_type = models.CharField(max_length=20, choices=SCHOOL_TYPE_CHOICES, default='PRIMARIA')
    blocked = models.BooleanField(default=False)
    current_ano_letivo = models.IntegerField(null=True, blank=True)
    current_trimestre = models.IntegerField(choices=TRIMESTRE_CHOICES, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.get_school_type_display()})"


class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Utilizador personalizado do sistema.
    Controla apenas o acesso e o cargo (role).
    """
    ROLE_CHOICES = [
        ('ADMIN_SISTEMA', 'Admin do Sistema'),
        ('SDEJT_RAP', 'SDEJT - Repartição de Adm e Planificação'),
        ('SDEJT_REG', 'SDEJT - Repartição de Ensino Geral'),
        ('ADMIN_ESCOLA', 'Director da Escola'),
        ('DAP', 'Director Adjunto Pedagógico'),
        ('DAE', 'Director Adjunto de Escola'),
        ('PROFESSOR', 'Professor'),
        ('ADMINISTRATIVO', 'Sector Administrativo'),
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    
    district = models.ForeignKey(District, null=True, blank=True, on_delete=models.SET_NULL)
    school = models.ForeignKey(School, null=True, blank=True, on_delete=models.CASCADE)
    
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def get_short_name(self):
        return self.first_name

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
