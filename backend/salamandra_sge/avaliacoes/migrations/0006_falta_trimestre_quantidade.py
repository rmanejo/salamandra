from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('avaliacoes', '0005_alter_nota_tipo_resumotrimestral'),
    ]

    operations = [
        migrations.AddField(
            model_name='falta',
            name='trimestre',
            field=models.IntegerField(choices=[(1, '1º Trimestre'), (2, '2º Trimestre'), (3, '3º Trimestre')], default=1),
        ),
        migrations.AddField(
            model_name='falta',
            name='quantidade',
            field=models.PositiveIntegerField(default=1),
        ),
    ]
