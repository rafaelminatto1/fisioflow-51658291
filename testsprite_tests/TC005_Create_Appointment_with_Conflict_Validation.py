import requests
from requests.auth import HTTPBasicAuth
import uuid
import datetime
import time

BASE_ENDPOINT = "http://localhost:8085"
AUTH = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def create_patient():
    """Helper to create a patient for appointment tests."""
    url = f"{BASE_ENDPOINT}/api/patients"
    # Brazilian valid CPF example and generic patient data
    patient_data = {
        "name": f"Test Patient {uuid.uuid4().hex[:6]}",
        "cpf": "11144477735",  # Valid CPF number for testing
        "birthDate": "1990-01-01",
        "email": f"test.patient+{uuid.uuid4().hex[:6]}@example.com",
        "phone": "11999999999"
    }
    resp = requests.post(url, json=patient_data, auth=AUTH, headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()["id"]

def create_professional():
    """Helper to create a professional for appointment tests."""
    url = f"{BASE_ENDPOINT}/api/professionals"
    professional_data = {
        "name": f"Test Professional {uuid.uuid4().hex[:6]}",
        "specialty": "Physiotherapist"
    }
    resp = requests.post(url, json=professional_data, auth=AUTH, headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()["id"]

def create_room():
    """Helper to create a room for appointment tests."""
    url = f"{BASE_ENDPOINT}/api/rooms"
    room_data = {
        "name": f"Room {uuid.uuid4().hex[:6]}",
        "location": "1st Floor"
    }
    resp = requests.post(url, json=room_data, auth=AUTH, headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()["id"]

def create_appointment(patient_id, professional_id, room_id, start_datetime, duration_minutes=60):
    url = f"{BASE_ENDPOINT}/api/appointments"
    appointment_data = {
        "patientId": patient_id,
        "professionalIds": [professional_id],
        "roomId": room_id,
        "startTime": start_datetime.isoformat(),
        "duration": duration_minutes  # minutes
    }
    resp = requests.post(url, json=appointment_data, auth=AUTH, headers=HEADERS, timeout=TIMEOUT)
    return resp

def delete_patient(patient_id):
    url = f"{BASE_ENDPOINT}/api/patients/{patient_id}"
    requests.delete(url, auth=AUTH, timeout=TIMEOUT)

def delete_professional(professional_id):
    url = f"{BASE_ENDPOINT}/api/professionals/{professional_id}"
    requests.delete(url, auth=AUTH, timeout=TIMEOUT)

def delete_room(room_id):
    url = f"{BASE_ENDPOINT}/api/rooms/{room_id}"
    requests.delete(url, auth=AUTH, timeout=TIMEOUT)

def delete_appointment(appointment_id):
    url = f"{BASE_ENDPOINT}/api/appointments/{appointment_id}"
    requests.delete(url, auth=AUTH, timeout=TIMEOUT)

def test_create_appointment_with_conflict_validation():
    # Setup: create patient, professional, and room
    patient_id = create_patient()
    professional_id = create_professional()
    room_id = create_room()

    appointment_ids = []
    try:
        now = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
        start_time_1 = now.replace(second=0, microsecond=0)
        # Create first appointment - should succeed
        resp1 = create_appointment(patient_id, professional_id, room_id, start_time_1, duration_minutes=60)
        assert resp1.status_code == 201, f"Expected 201 Created, got {resp1.status_code}"
        appointment_1 = resp1.json()
        appointment_ids.append(appointment_1["id"])

        # Attempt to create conflicting appointment with same professional and room overlapping time
        start_time_conflict = start_time_1 + datetime.timedelta(minutes=30)  # Overlaps first by 30 minutes
        resp2 = create_appointment(patient_id, professional_id, room_id, start_time_conflict, duration_minutes=60)
        # Conflict expected - assuming 409 Conflict or relevant error status code from API
        assert resp2.status_code in (409, 400), f"Expected conflict status (409 or 400), got {resp2.status_code}"
        error_resp = resp2.json()
        assert "conflict" in error_resp.get("message", "").lower() or "conflict" in str(error_resp).lower(), "Expected conflict error message"

        # Attempt to create appointment with different professional but same room and overlapping time - 
        # expecting conflict if room is shared resource and conflict detection is active
        other_professional_id = create_professional()
        appointment_ids.append("dummy")  # placeholder to delete
        resp3 = create_appointment(patient_id, other_professional_id, room_id, start_time_conflict, duration_minutes=60)
        # Expect conflict due to room usage
        assert resp3.status_code in (409, 400), f"Expected conflict status due to room, got {resp3.status_code}"
        error_resp3 = resp3.json()
        assert "conflict" in error_resp3.get("message", "").lower() or "conflict" in str(error_resp3).lower(), "Expected conflict error message for room"

        # Attempt to create appointment with same professional but different room, overlapping time - expecting conflict due to professional
        other_room_id = create_room()
        appointment_ids.append("dummy2")  # placeholder
        resp4 = create_appointment(patient_id, professional_id, other_room_id, start_time_conflict, duration_minutes=60)
        # Expect conflict due to professional usage
        assert resp4.status_code in (409, 400), f"Expected conflict status due to professional, got {resp4.status_code}"
        error_resp4 = resp4.json()
        assert "conflict" in error_resp4.get("message", "").lower() or "conflict" in str(error_resp4).lower(), "Expected conflict error message for professional"

        # Attempt to create appointment with different professional and different room, overlapping time - should succeed
        resp5 = create_appointment(patient_id, other_professional_id, other_room_id, start_time_conflict, duration_minutes=60)
        assert resp5.status_code == 201, f"Expected 201 Created for different professional and room, got {resp5.status_code}"
        appointment_5 = resp5.json()
        appointment_ids.append(appointment_5["id"])

    finally:
        # Cleanup appointments
        for appt_id in appointment_ids:
            if appt_id not in ("dummy", "dummy2"):
                try:
                    delete_appointment(appt_id)
                except Exception:
                    pass
        # Cleanup patient, professionals and rooms
        try:
            delete_patient(patient_id)
        except Exception:
            pass
        try:
            delete_professional(professional_id)
        except Exception:
            pass
        try:
            delete_professional(other_professional_id)
        except Exception:
            pass
        try:
            delete_room(room_id)
        except Exception:
            pass
        try:
            delete_room(other_room_id)
        except Exception:
            pass

test_create_appointment_with_conflict_validation()