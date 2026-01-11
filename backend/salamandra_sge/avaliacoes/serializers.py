from rest_framework import serializers
from .models import Nota, Falta, ResumoTrimestral

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
