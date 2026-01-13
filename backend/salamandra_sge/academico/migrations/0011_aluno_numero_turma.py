from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academico', '0010_aluno_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='aluno',
            name='numero_turma',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
