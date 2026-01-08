from django.contrib import admin
from .models import District, School, CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')

admin.site.register(District)
admin.site.register(School)
