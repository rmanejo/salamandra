from rest_framework import serializers
from .models import Disciplina, Aluno, Turma, Classe

class DisciplinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disciplina
        fields = ['id', 'nome', 'school']
        read_only_fields = ['school']

class AlunoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aluno
        fields = '__all__'
        read_only_fields = ['school']

class TransferenciaAlunoSerializer(serializers.Serializer):
    escola_destino = serializers.CharField() # Ou ID se estiver no sistema
    motivo = serializers.CharField(required=False, allow_blank=True)

class MovimentacaoTurmaSerializer(serializers.Serializer):
    nova_turma_id = serializers.IntegerField()

class ProfessorCargoAssignmentSerializer(serializers.Serializer):
    professor_id = serializers.IntegerField()
    cargo_tipo = serializers.ChoiceField(choices=['DT', 'CC', 'DD'])
    entidade_id = serializers.IntegerField()
    ano_letivo = serializers.IntegerField()

class ClasseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classe
        fields = ['id', 'nome', 'school']
        read_only_fields = ['school']

class TurmaSerializer(serializers.ModelSerializer):
    classe = ClasseSerializer(read_only=True)
    classe_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Turma
        fields = ['id', 'nome', 'classe', 'classe_id', 'ano_letivo', 'school']
        read_only_fields = ['school']
