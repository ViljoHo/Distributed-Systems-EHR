import random
from locust import HttpUser, task, between

user_index = random.randint(0, 1000000)

class DoctorUser(HttpUser):
    wait_time = between(1, 5)
    token = None
    patients = []
    
    def on_start(self):
        response = self.client.post("/auth/login",
            json={
                "email": "admin@hospital.com",
                "password": "admin"
            })
        if response.status_code == 200:
            json = response.json()
            self.token = json["token"]
            self.create_patient()
    
    @task(1)
    def create_patient(self):
        global user_index
        response = self.client.post("/patients",
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "first_name": "John",
                "last_name": "Doe",
                "date_of_birth": "1990-05-15",
                "gender": "MALE",
                "phone": "+358401234567",
                "email": f"{user_index}@example.com",
                "ssn": f"{user_index}",
                "blood_type": "A+"
            })
        user_index += random.randint(0, 1000000)
        
        if response.status_code == 201:
            self.patients.append(response.json()["patient_id"])

    @task(5)
    def create_record_for_patient(self):
        patient_id = random.choice(self.patients)
        self.client.post(f"/patients/{patient_id}/records",
            name="/api/v1/patients/[id]/records",
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "diagnosis": "Common cold",
                "treatment": "Rest and fluids",
                "notes": "Follow up in 1 week if symptoms persist",
                "visit_date": "2026-02-27"
            })

    @task(40)
    def get_patient_by_id(self):
        patient_id = random.choice(self.patients)
        self.client.get(f"/patients/{patient_id}",
            name="/api/v1/patients/[id]",
            headers={"Authorization": f"Bearer {self.token}"})
    
    @task(20)
    def list_records_for_patient(self):
        patient_id = random.choice(self.patients)
        self.client.get(f"/patients/{patient_id}/records",
            name="/api/v1/patients/[id]/records",
            headers={"Authorization": f"Bearer {self.token}"})
