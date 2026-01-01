
import os
import django
import sys

# Setup Django environment
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import authenticate
from rest_framework.test import APIClient
from django.urls import reverse

def test_login():
    print("Testing direct authentication...")
    user = authenticate(username='admin', password='admin')
    if user:
        print(f"Direct auth success/User: {user}")
    else:
        print("Direct auth FAILED")

    print("\nTesting via API Client...")
    client = APIClient()
    response = client.post('/api/auth/login/', {'username': 'admin', 'password': 'admin'}, format='json')
    print(f"API Response Status: {response.status_code}")
    print(f"API Response Body: {response.data}")

if __name__ == '__main__':
    test_login()
