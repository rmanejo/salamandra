from rest_framework import serializers
from .models import Disciplina, Aluno, Turma, Classe, Professor

class DisciplinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disciplina
        fields = ['id', 'nome', 'school']
        read_only_fields = ['school']

class AlunoSerializer(serializers.ModelSerializer):
    classe_nome = serializers.CharField(source='classe_atual.nome', read_only=True)
    turma_nome = serializers.CharField(source='turma_atual.nome', read_only=True)

    class Meta:
        model = Aluno
        fields = '__all__'
        read_only_fields = ['school']

    def validate_classe_atual(self, value):
        request = self.context.get('request')
        if request and value and value.school != request.user.school:
            raise serializers.ValidationError("Classe não pertence à sua escola.")
        return value

class ProfessorSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    nome_com_cargos = serializers.SerializerMethodField()
    disciplinas_nomes = serializers.SerializerMethodField()

    class Meta:
        model = Professor
        fields = ['id', 'user', 'user_email', 'full_name', 'nome_com_cargos', 'disciplinas_nomes', 'anos_servico', 'tipo_provimento', 'formacao', 'area_formacao']
        read_only_fields = ['school']

    def get_disciplinas_nomes(self, obj):
        return ", ".join([d.nome for d in obj.disciplinas.all()]) or "-"

    def get_nome_com_cargos(self, obj):
        cargos = []
        import datetime
        ano_atual = datetime.datetime.now().year
        
        if obj.direccoes_turma.filter(ano_letivo=ano_atual).exists():
            cargos.append('DT')
        if obj.coordenacoes_classe.filter(ano_letivo=ano_atual).exists():
            cargos.append('CC')
        if obj.delegacoes_disciplina.filter(ano_letivo=ano_atual).exists():
            cargos.append('DD')
            
        if cargos:
            return f"{obj.user.get_full_name()} ({'/'.join(cargos)})"
        return obj.user.get_full_name()

class TransferenciaAlunoSerializer(serializers.Serializer):
    escola_destino = serializers.CharField() # Ou ID se estiver no sistema
    motivo = serializers.CharField(required=False, allow_blank=True)

class MovimentacaoTurmaSerializer(serializers.Serializer):
    nova_turma_id = serializers.IntegerField()

class ProfessorCargoAssignmentSerializer(serializers.Serializer):
    professor_id = serializers.IntegerField(allow_null=True)
    cargo_tipo = serializers.ChoiceField(choices=['DT', 'CC', 'DD'])
    entidade_id = serializers.IntegerField()
    ano_letivo = serializers.IntegerField()

class AtribuicaoDisciplinaSerializer(serializers.Serializer):
    disciplina_id = serializers.IntegerField()
    professor_id = serializers.IntegerField(allow_null=True) # Check if unassignment is needed (null)


class ClasseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classe
        fields = ['id', 'nome', 'school']
        read_only_fields = ['school']

class TurmaSerializer(serializers.ModelSerializer):
    classe = ClasseSerializer(read_only=True)
    classe_id = serializers.IntegerField(write_only=True, required=False)
    director_nome = serializers.SerializerMethodField()
    
    class Meta:
        model = Turma
        fields = ['id', 'nome', 'classe', 'classe_id', 'ano_letivo', 'school', 'director_nome']
        read_only_fields = ['school']

    def get_director_nome(self, obj):
        try:
            return obj.director_turma.professor.user.get_full_name()
        except:
            return None
