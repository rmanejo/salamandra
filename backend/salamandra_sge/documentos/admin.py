from django.contrib import admin
from django.db import transaction

from .models import ProfessorProfile, DocumentTemplate, TemplateMapping, GeneratedDocument


@admin.register(ProfessorProfile)
class ProfessorProfileAdmin(admin.ModelAdmin):
    list_display = ("professor", "nivel_academico", "area_formacao", "contacto", "is_complete")
    list_filter = ("is_complete",)
    search_fields = ("professor__user__first_name", "professor__user__last_name")


@admin.action(description="Ativar template selecionado")
def activate_template(modeladmin, request, queryset):
    for template in queryset.select_related("school"):
        with transaction.atomic():
            DocumentTemplate.objects.filter(
                school=template.school,
                doc_type=template.doc_type,
                faixa_alunos=template.faixa_alunos,
            ).exclude(id=template.id).update(is_active=False)
            template.is_active = True
            template.save(update_fields=["is_active"])


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ("school", "doc_type", "faixa_alunos", "version", "is_active", "created_at")
    list_filter = ("doc_type", "faixa_alunos", "is_active")
    search_fields = ("school__name", "version")
    actions = [activate_template]


@admin.register(TemplateMapping)
class TemplateMappingAdmin(admin.ModelAdmin):
    list_display = ("template", "sheet_name", "start_row_alunos", "max_students")
    search_fields = ("template__school__name",)


@admin.register(GeneratedDocument)
class GeneratedDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "doc_type",
        "school",
        "turma",
        "disciplina",
        "trimestre",
        "ano_lectivo",
        "part_number",
        "parts_total",
        "created_at",
    )
    list_filter = ("doc_type", "trimestre", "ano_lectivo")
    search_fields = ("turma__nome", "disciplina__nome", "school__name")
