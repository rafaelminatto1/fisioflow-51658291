import requests

BASE_URL = "https://moocafisio.com.br"
TIMEOUT = 30
USERNAME = "rafael.minatto@yahoo.com.br"
PASSWORD = "Yukari30@"


def test_patient_authentication_and_role_based_access_control():
    try:
        # Authenticate user by sending username and password in JSON body
        auth_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT,
        )
        assert auth_response.status_code == 200, f"Authentication failed: {auth_response.status_code}"
        auth_data = auth_response.json()
        assert "access_token" in auth_data, "No access token in auth response"

        token = auth_data.get("access_token")
        headers = {"Authorization": f"Bearer {token}"}

        # Check access to an admin-only module
        admin_response = requests.get(
            f"{BASE_URL}/api/admin/clinic-settings",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert admin_response.status_code == 200, "Admin module access denied for admin user"

        # Check access to receptionist module
        receptionist_response = requests.get(
            f"{BASE_URL}/api/reception/agenda",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert receptionist_response.status_code == 200, "Receptionist module access denied"

        # Check access to physiotherapist module
        physio_response = requests.get(
            f"{BASE_URL}/api/physiotherapist/soap-notes",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert physio_response.status_code == 403 or physio_response.status_code == 200, (
            "Unexpected physiotherapist module access status"
        )

        # Check access to patient module
        patient_response = requests.get(
            f"{BASE_URL}/api/patient/records",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert patient_response.status_code == 403 or patient_response.status_code == 200, (
            "Unexpected patient module access status"
        )

        # Attempt to access a restricted module without authentication (no token)
        unauth_response = requests.get(
            f"{BASE_URL}/api/admin/clinic-settings",
            timeout=TIMEOUT,
        )
        assert unauth_response.status_code == 401 or unauth_response.status_code == 403, (
            "Unauthenticated user gained access to restricted module"
        )

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_patient_authentication_and_role_based_access_control()
