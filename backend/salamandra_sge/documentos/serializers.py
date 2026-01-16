from rest_framework import serializers

from .models import ProfessorProfile


class ProfessorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfessorProfile
        fields = ["id", "area_formacao", "nivel_academico", "contacto", "assinatura", "is_complete"]
        read_only_fields = ["id", "is_complete"]

    def validate(self, attrs):
        for field in ["area_formacao", "nivel_academico", "contacto"]:
            value = attrs.get(field)
            if value is not None and not str(value).strip():
                raise serializers.ValidationError({field: "Campo obrigatório."})
        return attrs


class CadernetaGenerateSerializer(serializers.Serializer):
    turma_id = serializers.IntegerField()
    disciplina_id = serializers.IntegerField()
    trimestre = serializers.IntegerField()
    ano_lectivo = serializers.IntegerField(required=False)
