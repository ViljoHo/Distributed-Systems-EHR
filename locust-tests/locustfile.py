import time
from locust import HttpUser, task, between

class PatientUser(HttpUser):
    wait_time = between(1,5)

    @task
    def register_user(self):
        self.client.post("/auth/register", json={"email":"patient@email.com", "password":"password", "role":"PATIENT", "ssn":"patient-ssn"})

    # @task
    # def 