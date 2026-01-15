from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_alter_customuser_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='school',
            name='current_ano_letivo',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='school',
            name='current_trimestre',
            field=models.IntegerField(blank=True, choices=[(1, '1º Trimestre'), (2, '2º Trimestre'), (3, '3º Trimestre')], null=True),
        ),
    ]
