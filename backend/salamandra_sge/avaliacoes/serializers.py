from rest_framework import serializers
from .models import Nota, Falta, ResumoTrimestral


class NotaUpsertSerializer(serializers.Serializer):
    aluno_id = serializers.IntegerField()
    turma_id = serializers.IntegerField()
    disciplina_id = serializers.IntegerField()
    trimestre = serializers.ChoiceField(choices=Nota.TRIMESTRE_CHOICES)
    tipo = serializers.ChoiceField(choices=Nota.TIPOS_AVALIACAO)
    valor = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        required=False,
        allow_null=True
    )

    def validate_valor(self, value):
        if value is None:
            return value
        if value < 0 or value > 20:
            raise serializers.ValidationError("valor deve estar entre 0 e 20.")
        return value

class NotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Nota
        fields = '__all__'
        read_only_fields = ['school', 'data_lancamento']

class FaltaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Falta
        fields = '__all__'
        read_only_fields = ['school', 'created_at']

class ResumoTrimestralSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumoTrimestral
        fields = '__all__'
        read_only_fields = ['school']
