import requests
from requests.auth import HTTPBasicAuth
import uuid
import time

BASE_URL = "http://localhost:8085"
USERNAME = "rafael.minatto@yahoo.com.br"
PASSWORD = "Yukari30@"
TIMEOUT = 30

def test_patient_record_editing_and_data_integrity():
    headers = {
        "Content-Type": "application/json",
    }
    auth = HTTPBasicAuth(USERNAME, PASSWORD)

    # Step 1: Create a new patient record
    unique_suffix = uuid.uuid4().hex[:8]
    new_patient_payload = {
        "name": f"Test Patient {unique_suffix}",
        "cpf": "14538220620",  # Valid CPF format (example)
        "birthDate": "1980-05-15",
        "gender": "male",
        "phone": "+5511999999999",
        "email": f"testpatient{unique_suffix}@example.com",
        "address": "Rua Teste, 123",
        "clinicalHistory": [
            {
                "date": "2023-01-01",
                "description": "Initial clinical data"
            }
        ],
        "documents": [],
        "active": True
    }

    patient_create_resp = requests.post(
        f"{BASE_URL}/api/patients",
        json=new_patient_payload,
        headers=headers,
        auth=auth,
        timeout=TIMEOUT,
    )
    assert patient_create_resp.status_code == 201, f"Patient creation failed: {patient_create_resp.text}"
    patient = patient_create_resp.json()
    patient_id = patient.get("id")
    assert patient_id, "No patient ID returned at creation"

    try:
        # Step 2: Retrieve the patient record to verify creation and data presence
        get_resp = requests.get(
            f"{BASE_URL}/api/patients/{patient_id}",
            headers=headers,
            auth=auth,
            timeout=TIMEOUT,
        )
        assert get_resp.status_code == 200, f"Patient retrieval failed: {get_resp.text}"
        patient_data = get_resp.json()

        # Verify historical clinical data and documents exist
        clinical_history = patient_data.get("clinicalHistory")
        documents = patient_data.get("documents")
        assert clinical_history and isinstance(clinical_history, list) and len(clinical_history) > 0, \
            "Clinical history missing or empty on initial record"
        assert documents is not None and isinstance(documents, list), \
            "Documents missing or not a list on initial record"

        # Step 3: Update patient record - edit name and add a new clinical history entry
        updated_name = f"{new_patient_payload['name']} Edited"
        new_clinical_history_entry = {
            "date": time.strftime("%Y-%m-%d"),
            "description": "Follow-up clinical note added"
        }
        updated_payload = patient_data.copy()
        updated_payload["name"] = updated_name
        # Append new clinical history entry preserving old entries
        updated_payload["clinicalHistory"] = clinical_history + [new_clinical_history_entry]

        update_resp = requests.put(
            f"{BASE_URL}/api/patients/{patient_id}",
            json=updated_payload,
            headers=headers,
            auth=auth,
            timeout=TIMEOUT,
        )
        assert update_resp.status_code == 200, f"Patient update failed: {update_resp.text}"

        # Step 4: Retrieve updated record to verify changes and data integrity
        get_updated_resp = requests.get(
            f"{BASE_URL}/api/patients/{patient_id}",
            headers=headers,
            auth=auth,
            timeout=TIMEOUT,
        )
        assert get_updated_resp.status_code == 200, f"Patient retrieval after update failed: {get_updated_resp.text}"
        updated_patient_data = get_updated_resp.json()

        # Assert the name change is reflected immediately
        assert updated_patient_data.get("name") == updated_name, "Patient name update not reflected"

        # Assert all clinical history entries are present including the new one
        updated_clinical_history = updated_patient_data.get("clinicalHistory")
        assert updated_clinical_history and any(entry.get("description") == new_clinical_history_entry["description"] for entry in updated_clinical_history), \
            "New clinical history entry missing after update"
        assert len(updated_clinical_history) == len(clinical_history) + 1, "Clinical history length mismatch after update"

        # Assert documents remain unchanged
        updated_documents = updated_patient_data.get("documents")
        assert updated_documents == documents, "Documents changed unexpectedly after patient update"

    finally:
        # Cleanup: Delete the created patient record
        delete_resp = requests.delete(
            f"{BASE_URL}/api/patients/{patient_id}",
            headers=headers,
            auth=auth,
            timeout=TIMEOUT,
        )
        assert delete_resp.status_code in (200, 204), f"Patient deletion failed: {delete_resp.text}"

test_patient_record_editing_and_data_integrity()
