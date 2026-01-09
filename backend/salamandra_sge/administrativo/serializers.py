from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Funcionario, AvaliacaoDesempenho
from salamandra_sge.academico.models import Professor

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

class StaffRegistrationSerializer(serializers.Serializer):
    """
    Serializer para registo unificado de Funcionários e Professores.
    Cria User, Funcionario e opcionalmente Professor.
    """
    # User data
    email = serializers.EmailField()
    nome = serializers.CharField(max_length=150, required=False) # Supporting single name field
    first_name = serializers.CharField(max_length=30, required=False)
    last_name = serializers.CharField(max_length=30, required=False)
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[
        ('ADMIN_ESCOLA', 'Director da Escola'),
        ('DAP', 'Director Adjunto Pedagógico'),
        ('DAE', 'Director Adjunto de Escola'),
        ('PROFESSOR', 'Professor'),
        ('ADMINISTRATIVO', 'Sector Administrativo'),
    ])
    
    # Staff data
    cargo = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    sector = serializers.ChoiceField(
        choices=[('DIRECAO', 'Direção/Gestão'), ('PEDAGOGICO', 'Área Pedagógica'), ('SECRETARIA', 'Secretaria'), ('RH', 'Recursos Humanos'), ('APOIO', 'Apoio Administrativo')],
        required=False,
        allow_null=True
    )
    tipo_provimento = serializers.ChoiceField(choices=[('PROVISORIO', 'Provisório'), ('DEFINITIVO', 'Definitivo')], default='PROVISORIO')
    
    # Teacher flag & data (optional)
    is_teacher = serializers.BooleanField(default=False)
    formacao = serializers.ChoiceField(choices=['N4', 'N3', 'N2', 'N1'], required=False, allow_null=True)
    area_formacao = serializers.CharField(max_length=100, required=False, allow_null=True)
    disciplina_ids = serializers.ListField(child=serializers.IntegerField(), required=False)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email já está registado.")
        return value

    def create(self, validated_data):
        is_teacher = validated_data.pop('is_teacher', False)
        formacao = validated_data.pop('formacao', None)
        area_formacao = validated_data.pop('area_formacao', None)
        disciplina_ids = validated_data.pop('disciplina_ids', [])
        
        # User details
        email = validated_data.pop('email')
        password = validated_data.pop('password')
        role = validated_data.pop('role')
        
        # Handle Name
        nome = validated_data.pop('nome', '')
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        
        if nome and not (first_name or last_name):
            parts = nome.split(' ', 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ''
        
        school = self.context['request'].user.school

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=role,
                school=school,
                district=school.district
            )

            # Determine sector based on role if not provided
            sector = validated_data.get('sector')
            if not sector:
                if role in ['PROFESSOR', 'DAP', 'DAE']:
                    validated_data['sector'] = 'PEDAGOGICO'
                    if role in ['DAP', 'DAE']:
                        validated_data['sector'] = 'DIRECAO'
            
            # Create Funcionario profile
            Funcionario.objects.create(
                user=user,
                school=school,
                **validated_data
            )

            # Create Professor profile if requested
            if is_teacher or role in ['PROFESSOR', 'DAP', 'DAE']:
                professor = Professor.objects.create(
                    user=user,
                    school=school,
                    formacao=formacao,
                    area_formacao=area_formacao,
                    tipo_provimento=validated_data.get('tipo_provimento', 'PROVISORIO')
                )
                if disciplina_ids:
                    professor.disciplinas.set(disciplina_ids)

            return user
