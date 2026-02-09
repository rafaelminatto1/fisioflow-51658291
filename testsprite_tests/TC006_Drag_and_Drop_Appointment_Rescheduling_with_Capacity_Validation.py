import requests
from requests.auth import HTTPBasicAuth


BASE_URL = "http://localhost:8085"
AUTH = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30


def test_drag_and_drop_appointment_rescheduling_with_capacity_validation():
    # Step 1: Create a new appointment to have a reschedulable resource
    create_payload = {
        "patientId": "existing-patient-id",
        "professionalId": "existing-professional-id",
        "roomId": "existing-room-id",
        "startTime": "2026-02-01T09:00:00-03:00",
        "endTime": "2026-02-01T10:00:00-03:00"
    }

    appointment_id = None
    try:
        create_response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=create_payload,
            headers=HEADERS,
            auth=AUTH,
            timeout=TIMEOUT
        )
        assert create_response.status_code == 201, f"Appointment creation failed: {create_response.text}"
        appointment = create_response.json()
        appointment_id = appointment.get("id")
        assert appointment_id is not None, "Created appointment response missing id"

        new_start = "2026-02-01T11:00:00-03:00"
        new_end = "2026-02-01T12:00:00-03:00"

        update_payload = {
            "startTime": new_start,
            "endTime": new_end
        }

        update_response = requests.put(
            f"{BASE_URL}/api/appointments/{appointment_id}/reschedule",
            json=update_payload,
            headers=HEADERS,
            auth=AUTH,
            timeout=TIMEOUT
        )
        if update_response.status_code == 200:
            rescheduled = update_response.json()
            assert rescheduled.get("startTime") == new_start, "Start time not updated correctly"
            assert rescheduled.get("endTime") == new_end, "End time not updated correctly"
        elif update_response.status_code == 409:
            error_detail = update_response.json().get("detail", "")
            assert "capacity" in error_detail.lower() or "conflict" in error_detail.lower(), \
                f"Unexpected conflict/capacity error message: {error_detail}"
        else:
            assert False, f"Rescheduling failed with unexpected status {update_response.status_code}: {update_response.text}"

    finally:
        if appointment_id:
            try:
                del_response = requests.delete(
                    f"{BASE_URL}/api/appointments/{appointment_id}",
                    headers=HEADERS,
                    auth=AUTH,
                    timeout=TIMEOUT
                )
                assert del_response.status_code in (200, 204), \
                    f"Failed to delete appointment during cleanup: {del_response.text}"
            except Exception:
                pass


test_drag_and_drop_appointment_rescheduling_with_capacity_validation()
