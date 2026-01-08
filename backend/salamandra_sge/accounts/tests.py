from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from core.models import CustomUser

class AccountsTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            password='password123',
            first_name='Test',
            last_name='User',
            role='PROFESSOR'
        )

    def test_profile_requires_auth(self):
        url = reverse('accounts:profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_login_and_profile(self):
        login_url = reverse('accounts:login')
        response = self.client.post(login_url, {
            'email': 'test@example.com',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        profile_url = reverse('accounts:profile')
        response = self.client.get(profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')
