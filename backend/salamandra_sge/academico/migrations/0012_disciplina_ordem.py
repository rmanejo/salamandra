from django.db import migrations, models


def set_disciplina_ordem(apps, schema_editor):
    Disciplina = apps.get_model('academico', 'Disciplina')
    ordem_por_nome = [
        (1, 'Português'),
        (2, 'Inglês'),
        (3, 'Francês'),
        (4, 'História'),
        (5, 'Geografia'),
        (6, 'Química'),
        (7, 'Física'),
        (8, 'Biologia'),
        (9, 'Matemática'),
        (10, 'Agro-Pecuária'),
        (11, 'Educação Visual'),
        (12, 'Educação Física'),
        (13, 'TICs'),
    ]

    for ordem, nome in ordem_por_nome:
        Disciplina.objects.filter(nome=nome).update(ordem=ordem)


class Migration(migrations.Migration):

    dependencies = [
        ('academico', '0011_aluno_numero_turma'),
    ]

    operations = [
        migrations.AddField(
            model_name='disciplina',
            name='ordem',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.RunPython(set_disciplina_ordem, migrations.RunPython.noop),
    ]
