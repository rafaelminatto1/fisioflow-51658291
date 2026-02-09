import requests
from datetime import datetime

BASE_URL = "https://moocafisio.com.br"
TOKEN = "YOUR_JWT_TOKEN_HERE"
TIMEOUT = 30

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {TOKEN}"
}

def test_set_and_validate_appointment_duration_and_work_schedule():
    new_appointment_id = None

    # Sample professional, patient and room IDs
    professional_id = "1"
    patient_id = "1"
    room_id = "1"
    
    create_payload = {
        "patientId": patient_id,
        "professionalId": professional_id,
        "roomId": room_id,
        "start": "2026-02-10T09:00:00-03:00",
        "end": "2026-02-10T09:30:00-03:00",  # 30 minutes session
        "notes": "Test appointment to validate session duration and work schedule",
    }

    try:
        create_resp = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=headers,
            json=create_payload,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Failed to create appointment: {create_resp.text}"
        data = create_resp.json()
        new_appointment_id = data.get("id")
        assert new_appointment_id is not None, "No appointment ID returned after creation"

        start_time = data.get("start")
        end_time = data.get("end")
        start_dt = datetime.fromisoformat(start_time)
        end_dt = datetime.fromisoformat(end_time)
        duration_minutes = (end_dt - start_dt).total_seconds() / 60
        assert duration_minutes == 30, f"Appointment duration is {duration_minutes} minutes, expected 30"

        work_start_hour = 8
        work_end_hour = 18
        assert work_start_hour <= start_dt.hour < work_end_hour, "Appointment start time outside work schedule"
        assert work_start_hour < end_dt.hour <= work_end_hour or (end_dt.hour == work_end_hour and end_dt.minute == 0), "Appointment end time outside work schedule"

        edit_payload = {
            "start": "2026-02-10T10:00:00-03:00",
            "end": "2026-02-10T10:45:00-03:00",
            "notes": "Edited appointment to 45 min duration"
        }

        edit_resp = requests.put(
            f"{BASE_URL}/api/appointments/{new_appointment_id}",
            headers=headers,
            json=edit_payload,
            timeout=TIMEOUT
        )
        assert edit_resp.status_code == 200, f"Failed to edit appointment: {edit_resp.text}"
        edit_data = edit_resp.json()

        new_start_time = edit_data.get("start")
        new_end_time = edit_data.get("end")
        new_start_dt = datetime.fromisoformat(new_start_time)
        new_end_dt = datetime.fromisoformat(new_end_time)
        new_duration_minutes = (new_end_dt - new_start_dt).total_seconds() / 60
        assert new_duration_minutes == 45, f"Edited appointment duration is {new_duration_minutes} minutes, expected 45"

        assert work_start_hour <= new_start_dt.hour < work_end_hour, "Edited appointment start time outside work schedule"
        assert work_start_hour < new_end_dt.hour <= work_end_hour or (new_end_dt.hour == work_end_hour and new_end_dt.minute == 0), "Edited appointment end time outside work schedule"

    finally:
        if new_appointment_id is not None:
            del_resp = requests.delete(
                f"{BASE_URL}/api/appointments/{new_appointment_id}",
                headers=headers,
                timeout=TIMEOUT
            )
            assert del_resp.status_code in [200, 204], f"Failed to delete appointment during cleanup: {del_resp.text}"


test_set_and_validate_appointment_duration_and_work_schedule()
