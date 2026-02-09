import requests
from requests.auth import HTTPBasicAuth

BASE_ENDPOINT = "https://moocafisio.com.br"
TIMEOUT = 30
USERNAME = "rafael.minatto@yahoo.com.br"
PASSWORD = "Yukari30@"


def test_exercise_prescription_filtering_and_protocol_application():
    session = requests.Session()
    session.auth = HTTPBasicAuth(USERNAME, PASSWORD)
    headers = {"Accept": "application/json"}
    try:
        # Step 1: Authenticate by accessing a protected endpoint to verify login success.
        auth_response = session.get(f"{BASE_ENDPOINT}/api/users/me", headers=headers, timeout=TIMEOUT)
        assert auth_response.status_code == 200, f"Authentication failed: {auth_response.status_code}"
        assert auth_response.content, "Authentication response is empty"
        user_data = auth_response.json()
        assert "email" in user_data and user_data["email"] == USERNAME, "Authenticated user email mismatch."

        # Step 2: Request exercise library with filtering - example filter: category or difficulty (assumed query params)
        filter_params = {"category": "strength", "difficulty": "intermediate"}
        exercises_response = session.get(f"{BASE_ENDPOINT}/api/exercises", headers=headers, params=filter_params, timeout=TIMEOUT)
        assert exercises_response.status_code == 200, f"Failed to get filtered exercises: {exercises_response.status_code}"
        assert exercises_response.content, "Exercises response is empty"
        exercises = exercises_response.json()
        assert isinstance(exercises, list), "Exercises response is not a list"
        assert len(exercises) > 0, "Filtered exercises list is empty"

        # Step 3: Create a patient (required to apply prescription/protocol)
        # According to PRD, patient requires name, cpf (valid), birthdate, email, medical history fields might be optional.
        patient_payload = {
            "name": "Test Patient",
            "cpf": "12345678909",  # A dummy CPF assuming it passes validation
            "birthdate": "1990-01-01",
            "email": "testpatient@example.com",
            # Added realistic required fields possibly necessary according to PRD
            "phone": "11999999999"
        }
        patient_response = session.post(f"{BASE_ENDPOINT}/api/patients", headers={**headers, "Content-Type": "application/json"}, json=patient_payload, timeout=TIMEOUT)
        assert patient_response.status_code == 201, f"Failed to create patient: {patient_response.status_code}"
        assert patient_response.content, "Patient creation response is empty"
        patient = patient_response.json()
        patient_id = patient.get("id") or patient.get("_id")
        assert patient_id is not None, "Created patient missing ID"

        # Step 4: Apply an evidence-based protocol to patient's prescription
        protocols_response = session.get(f"{BASE_ENDPOINT}/api/protocols", headers=headers, timeout=TIMEOUT)
        assert protocols_response.status_code == 200, f"Failed to get protocols: {protocols_response.status_code}"
        assert protocols_response.content, "Protocols response is empty"
        protocols = protocols_response.json()
        assert isinstance(protocols, list) and len(protocols) > 0, "Protocols list is empty"
        protocol_to_apply = protocols[0]  # Pick first protocol for testing
        protocol_id = protocol_to_apply.get("id")
        assert protocol_id is not None, "Protocol missing ID"

        prescription_payload = {
            "protocol_id": protocol_id,
            "exercises": [],
            "notes": "Test prescription applying selected protocol."
        }
        prescription_response = session.post(
            f"{BASE_ENDPOINT}/api/patients/{patient_id}/prescriptions",
            headers={**headers, "Content-Type": "application/json"},
            json=prescription_payload,
            timeout=TIMEOUT
        )
        assert prescription_response.status_code == 201, f"Failed to apply protocol prescription: {prescription_response.status_code}"
        assert prescription_response.content, "Prescription response is empty"
        prescription = prescription_response.json()
        assert prescription.get("protocol_id") == protocol_id, "Applied protocol ID mismatch in prescription"

        # Step 5: Verify the prescription appears on the patient's prescriptions list
        patient_prescriptions_response = session.get(f"{BASE_ENDPOINT}/api/patients/{patient_id}/prescriptions", headers=headers, timeout=TIMEOUT)
        assert patient_prescriptions_response.status_code == 200, f"Failed to get patient's prescriptions: {patient_prescriptions_response.status_code}"
        assert patient_prescriptions_response.content, "Patient prescriptions response is empty"
        prescriptions_list = patient_prescriptions_response.json()
        assert any(p.get("id") == prescription.get("id") for p in prescriptions_list), "Prescription not found in patient's prescriptions"

    finally:
        # Clean up: delete created patient and associated data
        if 'patient_id' in locals():
            session.delete(f"{BASE_ENDPOINT}/api/patients/{patient_id}/prescriptions", headers=headers, timeout=TIMEOUT)
            session.delete(f"{BASE_ENDPOINT}/api/patients/{patient_id}", headers=headers, timeout=TIMEOUT)


test_exercise_prescription_filtering_and_protocol_application()
