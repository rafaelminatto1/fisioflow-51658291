import requests
import base64

BASE_URL = "https://moocafisio.com.br"
AUTH_USERNAME = "rafael.minatto@yahoo.com.br"
AUTH_PASSWORD = "Yukari30@"
TIMEOUT = 30

def get_auth_header():
    token = base64.b64encode(f"{AUTH_USERNAME}:{AUTH_PASSWORD}".encode()).decode()
    return {"Authorization": f"Basic {token}"}

def create_patient():
    url = f"{BASE_URL}/api/patients"
    headers = {
        **get_auth_header(),
        "Content-Type": "application/json"
    }
    payload = {
        "name": "Test Patient TC010",
        "cpf": "11144477735",
        "birthdate": "1990-01-01",
        "email": "test.patient.tc010@example.com"
    }
    response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    response.raise_for_status()
    json_data = response.json()
    assert "id" in json_data, "Response JSON does not contain patient id"
    return json_data["id"]

def create_soap_note(patient_id):
    url = f"{BASE_URL}/api/soap-notes"
    headers = {
        **get_auth_header(),
        "Content-Type": "application/json"
    }
    payload = {
        "patientId": patient_id,
        "subjective": "Subjective test note",
        "objective": "Objective test note",
        "assessment": "Assessment test note",
        "plan": "Plan test note"
    }
    response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    response.raise_for_status()
    json_data = response.json()
    assert "id" in json_data, "Response JSON does not contain SOAP note id"
    return json_data["id"]

def upload_attachment(soap_note_id, filename, file_content, content_type):
    url = f"{BASE_URL}/api/soap-notes/{soap_note_id}/attachments"
    headers = get_auth_header()  # Content-Type removed to let requests set multipart boundary
    files = {
        "file": (filename, file_content, content_type)
    }
    response = requests.post(url, files=files, headers=headers, timeout=TIMEOUT)
    response.raise_for_status()
    json_data = response.json()
    assert "attachmentId" in json_data, "Response JSON does not contain attachmentId"
    return json_data["attachmentId"]

def get_audit_trail(soap_note_id):
    url = f"{BASE_URL}/api/audit-trail?resourceType=soap-note&resourceId={soap_note_id}"
    headers = get_auth_header()
    response = requests.get(url, headers=headers, timeout=TIMEOUT)
    response.raise_for_status()
    return response.json()

def delete_soap_note(soap_note_id):
    url = f"{BASE_URL}/api/soap-notes/{soap_note_id}"
    headers = get_auth_header()
    response = requests.delete(url, headers=headers, timeout=TIMEOUT)
    response.raise_for_status()

def delete_patient(patient_id):
    url = f"{BASE_URL}/api/patients/{patient_id}"
    headers = get_auth_header()
    response = requests.delete(url, headers=headers, timeout=TIMEOUT)
    response.raise_for_status()

def test_attach_documents_to_soap_notes_and_verify_audit_trail():
    patient_id = None
    soap_note_id = None
    try:
        patient_id = create_patient()
        assert patient_id, "Failed to create patient"

        soap_note_id = create_soap_note(patient_id)
        assert soap_note_id, "Failed to create SOAP note"

        attachments = []
        file1_content = b"Test file content 1"
        file2_content = b"Test file content 2"

        attachment1_id = upload_attachment(soap_note_id, "test_document_1.txt", file1_content, "text/plain")
        assert attachment1_id, "Failed to upload first attachment"
        attachments.append(attachment1_id)

        attachment2_id = upload_attachment(soap_note_id, "test_document_2.txt", file2_content, "text/plain")
        assert attachment2_id, "Failed to upload second attachment"
        attachments.append(attachment2_id)

        audit_trail = get_audit_trail(soap_note_id)
        assert isinstance(audit_trail, list), "Audit trail response is not a list"
        attachment_events = [entry for entry in audit_trail if entry.get("action") == "attachment_upload" and entry.get("resourceId") == soap_note_id]
        assert len(attachment_events) >= 2, "Audit trail does not contain expected attachment upload entries"

        url_attachments = f"{BASE_URL}/api/soap-notes/{soap_note_id}/attachments"
        headers = get_auth_header()
        resp_attachments = requests.get(url_attachments, headers=headers, timeout=TIMEOUT)
        resp_attachments.raise_for_status()
        attachments_list = resp_attachments.json()
        uploaded_ids = {att["id"] for att in attachments_list}
        for att_id in attachments:
            assert att_id in uploaded_ids, f"Attachment {att_id} not found in SOAP note attachments"

    finally:
        if soap_note_id:
            try:
                delete_soap_note(soap_note_id)
            except Exception:
                pass
        if patient_id:
            try:
                delete_patient(patient_id)
            except Exception:
                pass

test_attach_documents_to_soap_notes_and_verify_audit_trail()
