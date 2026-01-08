from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Funcionario, AvaliacaoDesempenho

User = get_user_model()

class UserShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']

class FuncionarioSerializer(serializers.ModelSerializer):
    user_details = UserShortSerializer(source='user', read_only=True)
    
    class Meta:
        model = Funcionario
        fields = '__all__'
        read_only_fields = ['school']

class AvaliacaoDesempenhoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvaliacaoDesempenho
        fields = '__all__'
        read_only_fields = ['school', 'avaliador']
