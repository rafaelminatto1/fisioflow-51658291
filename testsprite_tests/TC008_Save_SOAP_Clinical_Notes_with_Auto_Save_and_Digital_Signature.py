import requests
import time

BASE_URL = "http://localhost:8085"
TIMEOUT = 30


def test_save_soap_clinical_notes_with_autosave_and_digital_signature():
    session = requests.Session()
    # Set Authorization header with placeholder JWT token to simulate JWT-based auth
    session.headers.update({
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "Bearer valid-jwt-token"
    })

    created_note_id = None
    try:
        # Step 1: Create a new SOAP clinical note (initial save)
        new_note_payload = {
            "patientId": "test-patient-id",
            "subjective": "Patient complains of mild lower back pain.",
            "objective": "Observed slight limping during walking.",
            "assessment": "Lumbar strain suspected.",
            "plan": "Prescribe physiotherapy twice a week for 4 weeks.",
            "attachments": [],
            "digitalSignature": None,
            "autoSaved": False
        }
        create_resp = session.post(
            f"{BASE_URL}/api/soap-notes",
            json=new_note_payload,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Failed to create SOAP note: {create_resp.text}"
        created_note = create_resp.json()
        created_note_id = created_note.get("id")
        assert created_note_id is not None, "Response missing SOAP note id"

        # Step 2: Auto-save update (simulate auto-save functionality)
        auto_save_payload = {
            "subjective": "Patient complains of mild lower back pain and occasional tingling.",
            "objective": "Observed slight limping during walking and reduced range of motion.",
            "assessment": "Lumbar strain with possible nerve involvement.",
            "plan": "Continue physiotherapy, add nerve mobilization exercises.",
            "autoSaved": True
        }
        auto_save_resp = session.put(
            f"{BASE_URL}/api/soap-notes/{created_note_id}",
            json=auto_save_payload,
            timeout=TIMEOUT
        )
        assert auto_save_resp.status_code == 200, f"Auto-save failed: {auto_save_resp.text}"
        updated_note = auto_save_resp.json()
        # Validate that autoSaved flag is True and data updated
        assert updated_note.get("autoSaved") is True, "Auto-save flag not present or not True"
        for field in ["subjective", "objective", "assessment", "plan"]:
            assert auto_save_payload[field] == updated_note.get(field), f"{field} not updated properly"

        # Step 3: Apply digital signature
        AUTH_USERNAME = "unknown-user@example.com"  # Since original auth removed, use placeholder
        digital_signature_payload = {
            "digitalSignature": {
                "signedBy": AUTH_USERNAME,
                "signedAt": int(time.time()),
                "signatureData": "base64-encoded-digital-signature-sample"
            }
        }
        sign_resp = session.patch(
            f"{BASE_URL}/api/soap-notes/{created_note_id}/signature",
            json=digital_signature_payload,
            timeout=TIMEOUT
        )
        assert sign_resp.status_code == 200, f"Digital signature application failed: {sign_resp.text}"
        signed_note = sign_resp.json()
        signature_info = signed_note.get("digitalSignature")
        assert signature_info is not None, "Digital signature info missing after signing"
        assert signature_info.get("signedBy") == AUTH_USERNAME, "Digital signature signer does not match"
        assert "signatureData" in signature_info, "Signature data missing in digital signature"

        # Step 4: Verify data persistence and correctness
        get_resp = session.get(
            f"{BASE_URL}/api/soap-notes/{created_note_id}",
            timeout=TIMEOUT
        )
        assert get_resp.status_code == 200, f"Failed to fetch SOAP note after signing: {get_resp.text}"
        fetched_note = get_resp.json()

        # Validate final data matches what was signed
        for key in ["subjective", "objective", "assessment", "plan"]:
            assert fetched_note.get(key) == auto_save_payload[key], f"{key} mismatch on fetch"
        fetched_signature = fetched_note.get("digitalSignature")
        assert fetched_signature is not None, "No digital signature found on fetched note"
        assert fetched_signature.get("signedBy") == AUTH_USERNAME, "Signature signer mismatch on fetch"

    finally:
        # Cleanup: delete the created SOAP note if created
        if created_note_id:
            try:
                del_resp = session.delete(
                    f"{BASE_URL}/api/soap-notes/{created_note_id}",
                    timeout=TIMEOUT
                )
                assert del_resp.status_code in (200, 204), f"Failed to delete SOAP note in cleanup: {del_resp.text}"
            except Exception:
                pass


test_save_soap_clinical_notes_with_autosave_and_digital_signature()
