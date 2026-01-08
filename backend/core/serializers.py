from rest_framework import serializers
from .models import District, School

class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ['id', 'name']
        
    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O nome do distrito não pode estar vazio")
        return value.strip()

