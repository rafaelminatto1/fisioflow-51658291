import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:8085"
AUTH = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def test_track_exercise_progress_and_export_reports():
    patient_id = None
    exercise_id = None
    progress_id = None
    prescription_id = None
    try:
        # 1. Create a new patient (minimal required data)
        patient_payload = {
            "name": "Test Patient",
            "cpf": "11144477735",  # Valid CPF number
            "email": "test.patient@example.com"
        }
        patient_resp = requests.post(f"{BASE_URL}/api/patients", json=patient_payload, auth=AUTH, headers=HEADERS, timeout=TIMEOUT)
        assert patient_resp.status_code == 201, f"Failed to create patient: {patient_resp.text}"
        patient_data = patient_resp.json()
        patient_id = patient_data.get("id")
        assert patient_id is not None, "Patient ID not returned on creation"

        # 2. Add an exercise from library (simulate retrieving exercise list first)
        exercises_resp = requests.get(f"{BASE_URL}/api/exercises", auth=AUTH, headers=HEADERS, timeout=TIMEOUT)
        assert exercises_resp.status_code == 200, f"Failed to get exercises: {exercises_resp.text}"
        exercises_list = exercises_resp.json()
        assert isinstance(exercises_list, list) and len(exercises_list) > 0, "No exercises available"
        exercise_id = exercises_list[0].get("id")
        assert exercise_id is not None, "Exercise ID missing"

        # 3. Prescribe the exercise for the patient
        prescription_payload = {
            "patientId": patient_id,
            "exercises": [
                {
                    "exerciseId": exercise_id,
                    "sets": 3,
                    "repetitions": 15,
                    "duration_seconds": 60
                }
            ]
        }
        prescription_resp = requests.post(f"{BASE_URL}/api/prescriptions", json=prescription_payload, auth=AUTH, headers=HEADERS, timeout=TIMEOUT)
        assert prescription_resp.status_code == 201, f"Failed to create prescription: {prescription_resp.text}"
        prescription_data = prescription_resp.json()
        prescription_id = prescription_data.get("id")
        assert prescription_id is not None, "Prescription ID not returned"

        # 4. Track exercise progress update for the patient
        progress_payload = {
            "patientId": patient_id,
            "exerciseId": exercise_id,
            "date": "2026-01-31",
            "completed_sets": 3,
            "completed_repetitions": 45,
            "notes": "Patient showed good improvement."
        }
        progress_resp = requests.post(f"{BASE_URL}/api/exercise-progress", json=progress_payload, auth=AUTH, headers=HEADERS, timeout=TIMEOUT)
        assert progress_resp.status_code == 201, f"Failed to track exercise progress: {progress_resp.text}"
        progress_data = progress_resp.json()
        progress_id = progress_data.get("id")
        assert progress_id is not None, "Progress ID not returned"

        # 5. Export comprehensive report for the patient
        export_params = {
            "patientId": patient_id,
            "format": "pdf"
        }
        export_resp = requests.get(f"{BASE_URL}/api/reports/exercise-progress", params=export_params, auth=AUTH, timeout=TIMEOUT)
        assert export_resp.status_code == 200, f"Failed to export report: {export_resp.text}"
        content_type = export_resp.headers.get("Content-Type", "")
        assert "pdf" in content_type.lower(), f"Unexpected report content type: {content_type}"
        content_length = len(export_resp.content)
        assert content_length > 0, "Exported report is empty"

    finally:
        # Cleanup progress record
        if progress_id:
            requests.delete(f"{BASE_URL}/api/exercise-progress/{progress_id}", auth=AUTH, timeout=TIMEOUT)
        # Cleanup prescription
        if prescription_id:
            requests.delete(f"{BASE_URL}/api/prescriptions/{prescription_id}", auth=AUTH, timeout=TIMEOUT)
        # Cleanup patient record
        if patient_id:
            requests.delete(f"{BASE_URL}/api/patients/{patient_id}", auth=AUTH, timeout=TIMEOUT)

test_track_exercise_progress_and_export_reports()
