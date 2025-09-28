#!/usr/bin/env python3
import requests
import json
import uuid

BASE_URL = "https://classmate-34.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Login as superadmin first
superadmin_creds = {"email": "admin@school.com", "password": "admin123"}
response = requests.post(f"{BASE_URL}/auth/login", json=superadmin_creds, headers=HEADERS)
superadmin_token = response.json()['access_token']

# Create department
dept_name = f"Test Dept {uuid.uuid4().hex[:6]}"
response = requests.post(f"{BASE_URL}/departments?name={dept_name}", 
                        headers={**HEADERS, "Authorization": f"Bearer {superadmin_token}"})
dept_id = response.json()['id']

# Register subadmin
subadmin_data = {
    "email": f"subadmin{uuid.uuid4().hex[:6]}@school.com",
    "username": "Sub Admin Test",
    "password": "subadmin123",
    "role": "subadmin",
    "department_id": dept_id
}
response = requests.post(f"{BASE_URL}/auth/register", json=subadmin_data, 
                        headers={**HEADERS, "Authorization": f"Bearer {superadmin_token}"})

# Login as subadmin
subadmin_creds = {"email": subadmin_data['email'], "password": subadmin_data['password']}
response = requests.post(f"{BASE_URL}/auth/login", json=subadmin_creds, headers=HEADERS)
subadmin_token = response.json()['access_token']

# Create class
class_name = f"CS-101-{uuid.uuid4().hex[:4]}"
response = requests.post(f"{BASE_URL}/classes?name={class_name}&department_id={dept_id}", 
                        headers={**HEADERS, "Authorization": f"Bearer {subadmin_token}"})
class_id = response.json()['id']

# Register teacher
teacher_data = {
    "email": f"teacher{uuid.uuid4().hex[:6]}@school.com",
    "username": "Class Teacher Test",
    "password": "teacher123",
    "role": "class_teacher",
    "class_id": class_id,
    "department_id": dept_id
}
response = requests.post(f"{BASE_URL}/auth/register", json=teacher_data, 
                        headers={**HEADERS, "Authorization": f"Bearer {subadmin_token}"})

# Login as teacher
teacher_creds = {"email": teacher_data['email'], "password": teacher_data['password']}
response = requests.post(f"{BASE_URL}/auth/login", json=teacher_creds, headers=HEADERS)
teacher_token = response.json()['access_token']

# Register student
student_data = {
    "email": f"student{uuid.uuid4().hex[:6]}@school.com",
    "username": "Test Student",
    "roll_no": f"CS{uuid.uuid4().hex[:6].upper()}",
    "password": "dummy",
    "role": "student"
}
response = requests.post(f"{BASE_URL}/students", json=student_data, 
                        headers={**HEADERS, "Authorization": f"Bearer {teacher_token}"})

# Login as student
student_creds = {"roll_no": student_data['roll_no'], "email": student_data['email']}
response = requests.post(f"{BASE_URL}/auth/student-login", json=student_creds, headers=HEADERS)
student_token = response.json()['access_token']

# Generate QR code
response = requests.post(f"{BASE_URL}/qr/generate?class_id={class_id}&subject=Mathematics", 
                        headers={**HEADERS, "Authorization": f"Bearer {teacher_token}"})
qr_session_id = response.json()['session_id']

print(f"QR Session ID: {qr_session_id}")

# Try to scan QR code
print("Attempting QR scan...")
response = requests.post(f"{BASE_URL}/attendance/scan?qr_session_id={qr_session_id}", 
                        headers={**HEADERS, "Authorization": f"Bearer {student_token}"})

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")