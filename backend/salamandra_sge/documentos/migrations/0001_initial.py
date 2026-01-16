from django.db import migrations, models
import django.db.models.deletion
import django.db.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("core", "0006_school_current_period"),
        ("academico", "0013_alter_disciplina_options"),
    ]

    operations = [
        migrations.CreateModel(
            name="DocumentTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("doc_type", models.CharField(choices=[("CADERNETA", "Caderneta"), ("PAUTA", "Pauta")], default="CADERNETA", max_length=30)),
                ("faixa_alunos", models.PositiveIntegerField(choices=[(50, "Até 50"), (75, "Até 75"), (100, "Até 100")])),
                ("template_file", models.FileField(upload_to="document_templates/")),
                ("version", models.CharField(default="1", max_length=40)),
                ("is_active", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="document_templates_created", to="core.customuser")),
                ("school", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="document_templates", to="core.school")),
            ],
            options={
                "verbose_name": "Template de Documento",
                "verbose_name_plural": "Templates de Documentos",
            },
        ),
        migrations.CreateModel(
            name="GeneratedDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("doc_type", models.CharField(choices=[("CADERNETA", "Caderneta"), ("PAUTA", "Pauta")], max_length=30)),
                ("trimestre", models.IntegerField()),
                ("ano_lectivo", models.IntegerField()),
                ("file", models.FileField(upload_to="generated_documents/")),
                ("parts_total", models.PositiveIntegerField(default=1)),
                ("part_number", models.PositiveIntegerField(default=1)),
                ("template_version", models.CharField(blank=True, max_length=40)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("disciplina", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="generated_documents", to="academico.disciplina")),
                ("generated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="generated_documents", to="core.customuser")),
                ("school", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="generated_documents", to="core.school")),
                ("template_used", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="generated_documents", to="documentos.documenttemplate")),
                ("turma", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="generated_documents", to="academico.turma")),
            ],
            options={
                "verbose_name": "Documento Gerado",
                "verbose_name_plural": "Documentos Gerados",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ProfessorProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("area_formacao", models.CharField(blank=True, max_length=120)),
                ("nivel_academico", models.CharField(blank=True, max_length=120)),
                ("contacto", models.CharField(blank=True, max_length=50)),
                ("assinatura", models.ImageField(blank=True, null=True, upload_to="assinaturas/")),
                ("is_complete", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("professor", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to="academico.professor")),
            ],
            options={
                "verbose_name": "Perfil do Professor",
                "verbose_name_plural": "Perfis de Professores",
            },
        ),
        migrations.CreateModel(
            name="TemplateMapping",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sheet_name", models.CharField(blank=True, max_length=80)),
                ("header_cells", models.JSONField(default=dict)),
                ("start_row_alunos", models.PositiveIntegerField(default=15)),
                ("max_students", models.PositiveIntegerField()),
                ("grade_columns", models.JSONField(default=dict)),
                ("student_columns", models.JSONField(default=dict)),
                ("continuation_cell", models.CharField(blank=True, max_length=10)),
                ("template", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="mapping", to="documentos.documenttemplate")),
            ],
            options={
                "verbose_name": "Mapeamento do Template",
                "verbose_name_plural": "Mapeamentos de Templates",
            },
        ),
        migrations.AddConstraint(
            model_name="documenttemplate",
            constraint=models.UniqueConstraint(condition=django.db.models.Q(("is_active", True)), fields=("school", "doc_type", "faixa_alunos"), name="unique_active_template_per_scope"),
        ),
    ]
