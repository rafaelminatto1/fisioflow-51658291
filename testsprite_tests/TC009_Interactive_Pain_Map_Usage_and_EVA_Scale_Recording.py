import requests
from requests.auth import HTTPBasicAuth
import time

BASE_URL = "http://localhost:8085"
AUTH = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
TIMEOUT = 30

def test_interactive_pain_map_usage_and_eva_scale_recording():
    session = requests.Session()
    session.auth = AUTH
    session.headers.update({"Content-Type": "application/json"})

    # Step 1: Create a new patient to associate clinical record and pain map data
    patient_payload = {
        "name": "Test Patient",
        "cpf": "11144477735",
        "birthDate": "1980-01-01",
        "email": "test.patient@example.com",
        "phone": "11999999999",
        "gender": "M",
        "address": "Rua Teste, 123",
        "active": True
    }

    patient_id = None
    clinical_record_id = None

    try:
        # Create patient
        r = session.post(f"{BASE_URL}/api/patients", json=patient_payload, timeout=TIMEOUT)
        assert r.status_code == 201, f"Failed to create patient: {r.text}"
        patient_resp = r.json()
        patient_id = patient_resp.get("id")
        assert patient_id is not None, "Patient ID not returned in response"

        # Step 2: Create a clinical record (SOAP note) for this patient
        clinical_payload = {
            "patientId": patient_id,
            "subjective": "Initial subjective notes",
            "objective": "Initial objective notes",
            "assessment": "Initial assessment",
            "plan": "Initial plan"
        }
        r = session.post(f"{BASE_URL}/api/clinical-records", json=clinical_payload, timeout=TIMEOUT)
        assert r.status_code == 201, f"Failed to create clinical record: {r.text}"
        clinical_resp = r.json()
        clinical_record_id = clinical_resp.get("id")
        assert clinical_record_id is not None, "Clinical record ID not returned"

        # Step 3: Interact with pain map and record pain points with EVA scale
        # Simulate pain map points input: list of points with location and EVA rating 0-10
        pain_map_payload = {
            "clinicalRecordId": clinical_record_id,
            "painPoints": [
                {"x": 150, "y": 200, "evaScale": 7},
                {"x": 300, "y": 400, "evaScale": 4},
                {"x": 100, "y": 350, "evaScale": 10}
            ]
        }
        r = session.post(f"{BASE_URL}/api/pain-map", json=pain_map_payload, timeout=TIMEOUT)
        assert r.status_code == 200, f"Failed to save pain map data: {r.text}"
        pain_resp = r.json()
        assert pain_resp.get("success") is True, "Pain map save did not return success"

        # Step 4: Retrieve clinical record to verify pain map data saved accurately
        r = session.get(f"{BASE_URL}/api/clinical-records/{clinical_record_id}", timeout=TIMEOUT)
        assert r.status_code == 200, f"Failed to fetch clinical record: {r.text}"
        clinical_data = r.json()

        # Validate the pain map points exist and match input EVA values
        pain_points_saved = clinical_data.get("painPoints", [])
        assert len(pain_points_saved) == 3, "Pain points count mismatch"

        input_points = pain_map_payload["painPoints"]
        for input_point in input_points:
            matched = False
            for saved_point in pain_points_saved:
                if (
                    abs(saved_point.get("x", -1) - input_point["x"]) <= 1 and
                    abs(saved_point.get("y", -1) - input_point["y"]) <= 1 and
                    saved_point.get("evaScale") == input_point["evaScale"]
                ):
                    matched = True
                    break
            assert matched, f"Pain point {input_point} not found exactly in saved data"

    finally:
        # Cleanup: delete clinical record and patient if created
        if clinical_record_id:
            try:
                r = session.delete(f"{BASE_URL}/api/clinical-records/{clinical_record_id}", timeout=TIMEOUT)
                assert r.status_code in (200, 204), f"Failed to delete clinical record: {r.text}"
            except Exception:
                pass
        if patient_id:
            try:
                r = session.delete(f"{BASE_URL}/api/patients/{patient_id}", timeout=TIMEOUT)
                assert r.status_code in (200, 204), f"Failed to delete patient: {r.text}"
            except Exception:
                pass

test_interactive_pain_map_usage_and_eva_scale_recording()
