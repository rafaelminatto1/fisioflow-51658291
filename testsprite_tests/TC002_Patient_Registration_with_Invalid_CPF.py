import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "https://moocafisio.com.br"
AUTH = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
TIMEOUT = 30

def test_patient_registration_with_invalid_cpf():
    url = f"{BASE_URL}/api/patients"
    headers = {
        "Content-Type": "application/json"
    }
    # Example patient data with invalid CPF (digits only, invalid number)
    payload = {
        "name": "Test Invalid CPF",
        "cpf": "12345678900",  # Invalid CPF number without formatting
        "birthDate": "1990-01-01",
        "email": "test.invalidcpf@example.com",
        "phone": "11999999999"
    }

    response = None
    try:
        response = requests.post(url, json=payload, headers=headers, auth=AUTH, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

    assert response is not None, "No response received"

    try:
        json_resp = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    # Check that the error message is related to CPF validation
    error_msg_keys = ["message", "error", "cpf", "detail"]
    found_error = False
    for key in error_msg_keys:
        if key in json_resp:
            if isinstance(json_resp[key], str) and "cpf" in json_resp[key].lower():
                found_error = True
                break
            if isinstance(json_resp[key], dict) and any("cpf" in v.lower() for v in json_resp[key].values() if isinstance(v, str)):
                found_error = True
                break
    assert found_error, f"Expected error related to CPF validation but got: {json_resp}"

test_patient_registration_with_invalid_cpf()
