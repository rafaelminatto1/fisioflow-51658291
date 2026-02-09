import requests
from requests.auth import HTTPBasicAuth
import time

BASE_URL = "http://localhost:8085"
AUTH = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
TIMEOUT = 30

def test_TC017_audit_log_record_creation_and_verification():
    headers = {
        "Content-Type": "application/json"
    }
    patient_id = None
    appointment_id = None
    soap_note_id = None
    document_id = None

    try:
        # Step 1: Create a new patient (minimal valid data)
        patient_payload = {
            "name": "Test Patient Audit",
            "cpf": "52998224725",  # Correct valid CPF for testing
            "birth_date": "1990-01-01"
        }
        r = requests.post(f"{BASE_URL}/api/patients", json=patient_payload, auth=AUTH, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Failed to create patient: {r.text}"
        patient_id = r.json().get("id")
        assert patient_id, "Patient ID not returned"

        # Step 2: Edit patient's name (simulate patient edit)
        edit_payload = {
            "name": "Test Patient Audit Edited"
        }
        r = requests.put(f"{BASE_URL}/api/patients/{patient_id}", json=edit_payload, auth=AUTH, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 200, f"Failed to edit patient: {r.text}"

        # Step 3: Create an appointment for the patient
        appointment_payload = {
            "patientId": patient_id,
            "date": "2026-12-01T10:00:00Z",
            "durationMinutes": 60,
            "professionalId": "1",  # Assuming professional with ID 1 exists
            "roomId": "1"  # Assuming room with ID 1 exists
        }
        r = requests.post(f"{BASE_URL}/api/appointments", json=appointment_payload, auth=AUTH, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Failed to create appointment: {r.text}"
        appointment_id = r.json().get("id")
        assert appointment_id, "Appointment ID not returned"

        # Step 4: Edit the appointment time (simulate appointment change)
        appointment_edit_payload = {
            "date": "2026-12-01T11:00:00Z"
        }
        r = requests.put(f"{BASE_URL}/api/appointments/{appointment_id}", json=appointment_edit_payload, auth=AUTH, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 200, f"Failed to edit appointment: {r.text}"

        # Step 5: Create SOAP note for patient and appointment
        soap_payload = {
            "patientId": patient_id,
            "appointmentId": appointment_id,
            "subjective": "Patient reports mild pain.",
            "objective": "Observed slight swelling.",
            "assessment": "Condition stable.",
            "plan": "Continue exercises."
        }
        r = requests.post(f"{BASE_URL}/api/soap-notes", json=soap_payload, auth=AUTH, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 201, f"Failed to create SOAP note: {r.text}"
        soap_note_id = r.json().get("id")
        assert soap_note_id, "SOAP Note ID not returned"

        # Step 6: Update SOAP note to simulate edit
        soap_edit_payload = {
            "plan": "Increase exercise intensity."
        }
        r = requests.put(f"{BASE_URL}/api/soap-notes/{soap_note_id}", json=soap_edit_payload, auth=AUTH, headers=headers, timeout=TIMEOUT)
        assert r.status_code == 200, f"Failed to edit SOAP note: {r.text}"

        # Step 7: Upload document linked to patient (simulate document upload)
        files = {
            "file": ("test-document.txt", b"Audit log test content", "text/plain")
        }
        r = requests.post(f"{BASE_URL}/api/patients/{patient_id}/documents", auth=AUTH, files=files, timeout=TIMEOUT)
        assert r.status_code == 201, f"Failed to upload document: {r.text}"
        document_id = r.json().get("id")
        assert document_id, "Document ID not returned"

        # Small delay to ensure logs are recorded
        time.sleep(2)

        # Step 8: Retrieve audit logs filtered by patient ID and validate entries for all critical actions
        params = {
            "resourceType": "patient",
            "resourceId": patient_id,
            "limit": 50,
            "sort": "timestamp_desc"
        }
        r = requests.get(f"{BASE_URL}/api/audit-logs", auth=AUTH, headers=headers, params=params, timeout=TIMEOUT)
        assert r.status_code == 200, f"Failed to get audit logs: {r.text}"
        logs = r.json().get("logs", [])

        # Validate log existence for patient edit
        patient_edit_log = next((log for log in logs if log["action"] == "update_patient" and log["resourceId"] == patient_id), None)
        assert patient_edit_log is not None, "Patient edit action not logged"
        assert patient_edit_log.get("user") is not None, "Audit log missing user info for patient edit"
        assert patient_edit_log.get("timestamp") is not None, "Audit log missing timestamp for patient edit"

        # Retrieve logs for appointment
        params = {
            "resourceType": "appointment",
            "resourceId": appointment_id,
            "limit": 50,
            "sort": "timestamp_desc"
        }
        r = requests.get(f"{BASE_URL}/api/audit-logs", auth=AUTH, headers=headers, params=params, timeout=TIMEOUT)
        assert r.status_code == 200, f"Failed to get appointment audit logs: {r.text}"
        appointment_logs = r.json().get("logs", [])

        appointment_change_log = next((log for log in appointment_logs if log["action"] == "update_appointment" and log["resourceId"] == appointment_id), None)
        assert appointment_change_log is not None, "Appointment change action not logged"
        assert appointment_change_log.get("user") is not None, "Audit log missing user info for appointment change"
        assert appointment_change_log.get("timestamp") is not None, "Audit log missing timestamp for appointment change"

        # Retrieve logs for SOAP note
        params = {
            "resourceType": "soap_note",
            "resourceId": soap_note_id,
            "limit": 50,
            "sort": "timestamp_desc"
        }
        r = requests.get(f"{BASE_URL}/api/audit-logs", auth=AUTH, headers=headers, params=params, timeout=TIMEOUT)
        assert r.status_code == 200, f"Failed to get SOAP note audit logs: {r.text}"
        soap_logs = r.json().get("logs", [])

        soap_update_log = next((log for log in soap_logs if log["action"] == "update_soap_note" and log["resourceId"] == soap_note_id), None)
        assert soap_update_log is not None, "SOAP note update action not logged"
        assert soap_update_log.get("user") is not None, "Audit log missing user info for SOAP note update"
        assert soap_update_log.get("timestamp") is not None, "Audit log missing timestamp for SOAP note update"

        # Retrieve logs for document upload
        params = {
            "resourceType": "document",
            "resourceId": document_id,
            "limit": 50,
            "sort": "timestamp_desc"
        }
        r = requests.get(f"{BASE_URL}/api/audit-logs", auth=AUTH, headers=headers, params=params, timeout=TIMEOUT)
        assert r.status_code == 200, f"Failed to get document audit logs: {r.text}"
        document_logs = r.json().get("logs", [])

        document_upload_log = next((log for log in document_logs if log["action"] == "create_document" and log["resourceId"] == document_id), None)
        assert document_upload_log is not None, "Document upload action not logged"
        assert document_upload_log.get("user") is not None, "Audit log missing user info for document upload"
        assert document_upload_log.get("timestamp") is not None, "Audit log missing timestamp for document upload"

    finally:
        # Clean up: Delete created document
        if document_id:
            requests.delete(f"{BASE_URL}/api/documents/{document_id}", auth=AUTH, timeout=TIMEOUT)
        # Delete SOAP note
        if soap_note_id:
            requests.delete(f"{BASE_URL}/api/soap-notes/{soap_note_id}", auth=AUTH, timeout=TIMEOUT)
        # Delete appointment
        if appointment_id:
            requests.delete(f"{BASE_URL}/api/appointments/{appointment_id}", auth=AUTH, timeout=TIMEOUT)
        # Delete patient
        if patient_id:
            requests.delete(f"{BASE_URL}/api/patients/{patient_id}", auth=AUTH, timeout=TIMEOUT)

test_TC017_audit_log_record_creation_and_verification()
