import re

from django.db import models
from django.db.models import Q
from django.core.exceptions import ValidationError

from core.models import School, CustomUser
from salamandra_sge.academico.models import Professor, Turma, Disciplina


CELL_RE = re.compile(r"^[A-Z]{1,3}[1-9][0-9]*$")
COLUMN_RE = re.compile(r"^[A-Z]{1,3}$")


class ProfessorProfile(models.Model):
    professor = models.OneToOneField(
        Professor,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    area_formacao = models.CharField(max_length=120, blank=True)
    nivel_academico = models.CharField(max_length=120, blank=True)
    contacto = models.CharField(max_length=50, blank=True)
    assinatura = models.ImageField(upload_to="assinaturas/", null=True, blank=True)
    is_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Perfil do Professor"
        verbose_name_plural = "Perfis de Professores"

    def __str__(self):
        return f"Perfil {self.professor}"

    def _compute_complete(self):
        return all([self.area_formacao, self.nivel_academico, self.contacto])

    def save(self, *args, **kwargs):
        self.is_complete = self._compute_complete()
        super().save(*args, **kwargs)

    def missing_fields(self):
        missing = []
        if not self.area_formacao:
            missing.append("area_formacao")
        if not self.nivel_academico:
            missing.append("nivel_academico")
        if not self.contacto:
            missing.append("contacto")
        return missing


class DocumentTemplate(models.Model):
    DOC_TYPE_CADERNETA = "CADERNETA"
    DOC_TYPE_PAUTA = "PAUTA"
    DOC_TYPE_CHOICES = [
        (DOC_TYPE_CADERNETA, "Caderneta"),
        (DOC_TYPE_PAUTA, "Pauta"),
    ]
    FAIXA_CHOICES = [
        (50, "Até 50"),
        (65, "Até 65"),
        (75, "Até 75"),
        (100, "Até 100"),
    ]

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="document_templates")
    doc_type = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES, default=DOC_TYPE_CADERNETA)
    faixa_alunos = models.PositiveIntegerField(choices=FAIXA_CHOICES)
    template_file = models.FileField(upload_to="document_templates/")
    version = models.CharField(max_length=40, default="1")
    is_active = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="document_templates_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Template de Documento"
        verbose_name_plural = "Templates de Documentos"
        constraints = [
            models.UniqueConstraint(
                fields=["school", "doc_type", "faixa_alunos"],
                condition=Q(is_active=True),
                name="unique_active_template_per_scope",
            )
        ]

    def __str__(self):
        return f"{self.school} - {self.doc_type} ({self.faixa_alunos}) v{self.version}"


class TemplateMapping(models.Model):
    template = models.OneToOneField(
        DocumentTemplate,
        on_delete=models.CASCADE,
        related_name="mapping",
    )
    sheet_name = models.CharField(max_length=80, blank=True)
    header_cells = models.JSONField(default=dict)
    start_row_alunos = models.PositiveIntegerField(default=15)
    max_students = models.PositiveIntegerField()
    grade_columns = models.JSONField(default=dict)
    student_columns = models.JSONField(default=dict)
    continuation_cell = models.CharField(max_length=10, blank=True)

    class Meta:
        verbose_name = "Mapeamento do Template"
        verbose_name_plural = "Mapeamentos de Templates"

    def __str__(self):
        return f"Mapeamento {self.template}"

    @staticmethod
    def default_header_mapping():
        return {
            "professor_nome": "A9",
            "habilitacoes_academicas": "E9",
            "area_formacao": "N9",
            "contacto": "U9",
            "disciplina": "A10",
            "classe": "E10",
            "turma": "J10",
            "sala": "O10",
            "turno": "S10",
            "ano_lectivo": "W10",
            "total_alunos": "A11",
            "M": "C11",
            "H": "E11",
            "DT": "S11",
        }

    def clean(self):
        required = {
            "professor_nome",
            "habilitacoes_academicas",
            "area_formacao",
            "contacto",
            "disciplina",
            "classe",
            "turma",
            "ano_lectivo",
            "total_alunos",
        }
        header = self.header_cells or {}
        missing = required - set(header.keys())
        if missing:
            raise ValidationError({"header_cells": f"Faltam chaves obrigatórias: {', '.join(sorted(missing))}."})

        for key, cell in header.items():
            if cell and not CELL_RE.match(cell):
                raise ValidationError({"header_cells": f"Célula inválida para {key}: {cell}."})

        if self.continuation_cell and not CELL_RE.match(self.continuation_cell):
            raise ValidationError({"continuation_cell": "Célula inválida para continuação."})

        for mapping_name, mapping in {
            "grade_columns": self.grade_columns or {},
            "student_columns": self.student_columns or {},
        }.items():
            for key, cell in mapping.items():
                if cell and not (CELL_RE.match(cell) or COLUMN_RE.match(cell)):
                    raise ValidationError({mapping_name: f"Célula/coluna inválida para {key}: {cell}."})

        if self.template and self.max_students != self.template.faixa_alunos:
            raise ValidationError({"max_students": "max_students deve corresponder à faixa de alunos do template."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class GeneratedDocument(models.Model):
    DOC_TYPE_CHOICES = DocumentTemplate.DOC_TYPE_CHOICES

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="generated_documents")
    doc_type = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES)
    turma = models.ForeignKey(Turma, on_delete=models.CASCADE, related_name="generated_documents")
    disciplina = models.ForeignKey(Disciplina, on_delete=models.CASCADE, related_name="generated_documents")
    trimestre = models.IntegerField()
    ano_lectivo = models.IntegerField()
    generated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_documents",
    )
    file = models.FileField(upload_to="generated_documents/")
    parts_total = models.PositiveIntegerField(default=1)
    part_number = models.PositiveIntegerField(default=1)
    template_used = models.ForeignKey(
        DocumentTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_documents",
    )
    template_version = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Documento Gerado"
        verbose_name_plural = "Documentos Gerados"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.doc_type} {self.turma} ({self.created_at.date()})"
