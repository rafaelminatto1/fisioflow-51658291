import requests
from requests.auth import HTTPBasicAuth
import uuid
import time

BASE_URL = "http://localhost:8085"
AUTH = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}


def test_patient_record_deactivation_without_data_loss():
    patient_id = None

    def create_patient():
        # Create a patient with random CPF-like number for testing
        # Brazilian CPF format is 11 digits; here we generate 11 random digits
        # plus minimal required fields to pass validation.
        cpf = "12345678909"  # Use a known valid CPF for test or some dummy valid pattern
        payload = {
            "name": f"Test Patient {uuid.uuid4()}",
            "cpf": cpf,
            "birthdate": "1980-01-01",
            "email": f"test.patient.{uuid.uuid4()}@example.com",
            "phone": "11999999999",
            "address": "123 Test St, Sao Paulo, Brazil",
            "gender": "M"
        }
        response = requests.post(
            f"{BASE_URL}/api/patients",
            json=payload,
            headers=HEADERS,
            auth=AUTH,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return response.json().get("id")

    def add_clinical_history(patient_id):
        # Add clinical history/soap notes and documents to patient
        # Create SOAP clinical note
        soap_payload = {
            "patientId": patient_id,
            "subjective": "Patient reports mild pain",
            "objective": "Range of motion normal",
            "assessment": "Routine checkup",
            "plan": "Continue exercises",
            "attachments": []
        }
        response = requests.post(
            f"{BASE_URL}/api/clinical-records",
            json=soap_payload,
            headers=HEADERS,
            auth=AUTH,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        soap_id = response.json().get("id")

        # Upload a document (simulate by sending metadata only, actual file upload may be multipart)
        doc_payload = {
            "patientId": patient_id,
            "filename": "document.pdf",
            "contentType": "application/pdf",
            "description": "Test document"
        }
        response = requests.post(
            f"{BASE_URL}/api/patient-documents",
            json=doc_payload,
            headers=HEADERS,
            auth=AUTH,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        doc_id = response.json().get("id")

        return soap_id, doc_id

    def get_patient_full_data(patient_id):
        response = requests.get(
            f"{BASE_URL}/api/patients/{patient_id}/full",
            headers=HEADERS,
            auth=AUTH,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return response.json()

    def deactivate_patient(patient_id):
        payload = {"active": False}
        response = requests.patch(
            f"{BASE_URL}/api/patients/{patient_id}",
            json=payload,
            headers=HEADERS,
            auth=AUTH,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return response.json()

    def reactivate_patient(patient_id):
        payload = {"active": True}
        response = requests.patch(
            f"{BASE_URL}/api/patients/{patient_id}",
            json=payload,
            headers=HEADERS,
            auth=AUTH,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        return response.json()

    def delete_patient(patient_id):
        response = requests.delete(
            f"{BASE_URL}/api/patients/{patient_id}",
            headers=HEADERS,
            auth=AUTH,
            timeout=TIMEOUT,
        )
        # deletion might return 204 no content or 200
        if response.status_code not in (200, 204):
            response.raise_for_status()

    try:
        # Create patient
        patient_id = create_patient()
        assert patient_id is not None, "Failed to create patient"

        # Add clinical history and document
        soap_id, doc_id = add_clinical_history(patient_id)
        assert soap_id is not None, "Failed to add clinical history"
        assert doc_id is not None, "Failed to add document"

        # Retrieve full patient data before deactivation
        patient_data_before = get_patient_full_data(patient_id)
        assert patient_data_before.get("active") is True or patient_data_before.get("active") is None
        assert "clinicalHistory" in patient_data_before or "clinical_records" in patient_data_before
        assert "documents" in patient_data_before or "patientDocuments" in patient_data_before

        # Deactivate the patient
        deactivate_resp = deactivate_patient(patient_id)
        assert deactivate_resp.get("active") is False

        # Confirm patient is deactivated but data intact
        patient_data_after_deactivation = get_patient_full_data(patient_id)
        assert patient_data_after_deactivation.get("active") is False
        # Clinical history and documents should remain the same
        assert (
            patient_data_before.get("clinicalHistory", patient_data_before.get("clinical_records"))
            == patient_data_after_deactivation.get("clinicalHistory", patient_data_after_deactivation.get("clinical_records"))
        )
        assert (
            patient_data_before.get("documents", patient_data_before.get("patientDocuments"))
            == patient_data_after_deactivation.get("documents", patient_data_after_deactivation.get("patientDocuments"))
        )

        # Reactivate the patient
        reactivate_resp = reactivate_patient(patient_id)
        assert reactivate_resp.get("active") is True

        # Confirm patient is active again with full data intact
        patient_data_after_reactivation = get_patient_full_data(patient_id)
        assert patient_data_after_reactivation.get("active") is True
        assert (
            patient_data_before.get("clinicalHistory", patient_data_before.get("clinical_records"))
            == patient_data_after_reactivation.get("clinicalHistory", patient_data_after_reactivation.get("clinical_records"))
        )
        assert (
            patient_data_before.get("documents", patient_data_before.get("patientDocuments"))
            == patient_data_after_reactivation.get("documents", patient_data_after_reactivation.get("patientDocuments"))
        )

    finally:
        if patient_id:
            try:
                delete_patient(patient_id)
            except Exception:
                pass


test_patient_record_deactivation_without_data_loss()