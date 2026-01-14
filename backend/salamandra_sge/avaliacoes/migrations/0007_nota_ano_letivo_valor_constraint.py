from django.db import migrations, models


def preencher_ano_letivo(apps, schema_editor):
    Nota = apps.get_model('avaliacoes', 'Nota')
    for nota in Nota.objects.filter(ano_letivo__isnull=True).select_related('turma'):
        if nota.turma_id and nota.turma.ano_letivo:
            nota.ano_letivo = nota.turma.ano_letivo
            nota.save(update_fields=['ano_letivo'])


class Migration(migrations.Migration):
    dependencies = [
        ('avaliacoes', '0006_falta_trimestre_quantidade'),
    ]

    operations = [
        migrations.AddField(
            model_name='nota',
            name='ano_letivo',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='nota',
            name='valor',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True),
        ),
        migrations.RunPython(preencher_ano_letivo, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='nota',
            constraint=models.UniqueConstraint(
                fields=('school', 'aluno', 'turma', 'disciplina', 'ano_letivo', 'trimestre', 'tipo'),
                name='unique_nota_por_contexto'
            ),
        ),
    ]
