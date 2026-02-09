import requests
from requests.auth import HTTPBasicAuth
import uuid

BASE_URL = "http://localhost:8085"
AUTH = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def test_create_and_link_evaluation_forms_to_patients_and_sessions():
    patient_id = None
    session_id = None
    form_id = None

    try:
        # Step 1: Create a new patient (minimal valid data assuming API /api/patients)
        patient_payload = {
            "name": "Test Patient " + str(uuid.uuid4()),
            "cpf": "52998224725",  # Valid Brazilian CPF for testing
            "email": "test.patient@example.com",
            "birthdate": "1980-01-01"
        }
        r_patient = requests.post(
            f"{BASE_URL}/api/patients",
            json=patient_payload,
            auth=AUTH,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert r_patient.status_code == 201, f"Failed to create patient: {r_patient.text}"
        patient_data = r_patient.json()
        patient_id = patient_data.get("id")
        assert patient_id, "Patient ID not returned"

        # Step 2: Create a clinical session for the patient (assuming /api/sessions)
        session_payload = {
            "patientId": patient_id,
            "date": "2026-04-01T10:00:00Z",
            "therapist": "Dr. Test",
            "notes": "Initial clinical session."
        }
        r_session = requests.post(
            f"{BASE_URL}/api/sessions",
            json=session_payload,
            auth=AUTH,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert r_session.status_code == 201, f"Failed to create session: {r_session.text}"
        session_data = r_session.json()
        session_id = session_data.get("id")
        assert session_id, "Session ID not returned"

        # Step 3: Create an evaluation form using a template (assuming /api/evaluation-forms)
        form_template_payload = {
            "type": "template",
            "templateName": "Standard Physical Therapy Form",
            "patientId": patient_id,
            "sessionId": session_id,
            "fields": {
                "painLevel": 5,
                "mobility": "Good",
                "notes": "Patient reported moderate pain during movement."
            }
        }
        r_form_template = requests.post(
            f"{BASE_URL}/api/evaluation-forms",
            json=form_template_payload,
            auth=AUTH,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert r_form_template.status_code == 201, f"Failed to create form from template: {r_form_template.text}"
        form_template_data = r_form_template.json()
        form_id = form_template_data.get("id")
        assert form_id, "Form ID not returned"

        # Validate linkage to patient and session in the returned form data
        assert form_template_data.get("patientId") == patient_id, "Form patient linkage incorrect"
        assert form_template_data.get("sessionId") == session_id, "Form session linkage incorrect"

        # Step 4: Create a custom evaluation form using editor
        form_custom_payload = {
            "type": "custom",
            "patientId": patient_id,
            "sessionId": session_id,
            "fields": {
                "customField1": "Value 1",
                "customField2": "Value 2",
                "comments": "Custom form created for additional assessment."
            },
            "metadata": {
                "createdBy": "test_user"
            }
        }
        r_form_custom = requests.post(
            f"{BASE_URL}/api/evaluation-forms",
            json=form_custom_payload,
            auth=AUTH,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert r_form_custom.status_code == 201, f"Failed to create custom form: {r_form_custom.text}"
        form_custom_data = r_form_custom.json()
        custom_form_id = form_custom_data.get("id")
        assert custom_form_id, "Custom form ID not returned"
        assert form_custom_data.get("patientId") == patient_id, "Custom form patient linkage incorrect"
        assert form_custom_data.get("sessionId") == session_id, "Custom form session linkage incorrect"

        # Step 5: Retrieve evaluation forms linked to patient and session to validate linkage
        r_get_forms_patient = requests.get(
            f"{BASE_URL}/api/patients/{patient_id}/evaluation-forms",
            auth=AUTH,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert r_get_forms_patient.status_code == 200, f"Failed to get patient's forms: {r_get_forms_patient.text}"
        patient_forms = r_get_forms_patient.json()
        form_ids_patient = [f.get("id") for f in patient_forms]
        assert form_id in form_ids_patient, "Template form not linked to patient"
        assert custom_form_id in form_ids_patient, "Custom form not linked to patient"

        r_get_forms_session = requests.get(
            f"{BASE_URL}/api/sessions/{session_id}/evaluation-forms",
            auth=AUTH,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert r_get_forms_session.status_code == 200, f"Failed to get session's forms: {r_get_forms_session.text}"
        session_forms = r_get_forms_session.json()
        form_ids_session = [f.get("id") for f in session_forms]
        assert form_id in form_ids_session, "Template form not linked to session"
        assert custom_form_id in form_ids_session, "Custom form not linked to session"

    finally:
        # Cleanup forms
        if form_id:
            requests.delete(
                f"{BASE_URL}/api/evaluation-forms/{form_id}",
                auth=AUTH,
                headers=HEADERS,
                timeout=TIMEOUT
            )
        if 'custom_form_id' in locals() and custom_form_id:
            requests.delete(
                f"{BASE_URL}/api/evaluation-forms/{custom_form_id}",
                auth=AUTH,
                headers=HEADERS,
                timeout=TIMEOUT
            )
        # Cleanup session
        if session_id:
            requests.delete(
                f"{BASE_URL}/api/sessions/{session_id}",
                auth=AUTH,
                headers=HEADERS,
                timeout=TIMEOUT
            )
        # Cleanup patient
        if patient_id:
            requests.delete(
                f"{BASE_URL}/api/patients/{patient_id}",
                auth=AUTH,
                headers=HEADERS,
                timeout=TIMEOUT
            )

test_create_and_link_evaluation_forms_to_patients_and_sessions()
