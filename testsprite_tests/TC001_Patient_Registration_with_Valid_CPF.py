import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:8085"
AUTH = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}
TIMEOUT = 30

def test_patient_registration_with_valid_cpf():
    patient_payload = {
        "name": "João da Silva",
        "cpf": "12345678909",  # Valid CPF, use a commonly accepted valid CPF for test purposes
        "birthDate": "1985-05-15",
        "email": "joao.silva@example.com",
        "phone": "+5511999999999",
        "address": {
            "street": "Rua das Flores",
            "number": "123",
            "complement": "Apt 45",
            "district": "Centro",
            "city": "São Paulo",
            "state": "SP",
            "zipCode": "01001000"
        },
        "gender": "male",
        "emergencyContact": {
            "name": "Maria Silva",
            "phone": "+5511888888888",
            "relationship": "wife"
        }
    }

    # Since PRD does not specify exact patient registration endpoint or schema,
    # assume endpoint /api/patients with POST method for creation.

    created_patient_id = None
    try:
        # Create patient
        response = requests.post(
            f"{BASE_URL}/api/patients",
            auth=AUTH,
            headers=HEADERS,
            json=patient_payload,
            timeout=TIMEOUT
        )
        assert response.status_code == 201, f"Expected status 201, got {response.status_code}"
        data = response.json()
        assert "id" in data, "Response JSON missing patient id"
        created_patient_id = data["id"]

        # Validate returned data matches input and CPF is correctly set
        assert data.get("cpf") == patient_payload["cpf"], "CPF in response does not match input"
        assert data.get("name") == patient_payload["name"], "Name in response does not match input"

        # Validate mandatory fields are present and not empty in response
        mandatory_fields = ["name", "cpf", "birthDate", "gender"]
        for field in mandatory_fields:
            assert field in data and data[field], f"Mandatory field '{field}' is missing or empty"

    finally:
        # Clean up: delete the created patient if created_patient_id is available
        if created_patient_id:
            try:
                del_response = requests.delete(
                    f"{BASE_URL}/api/patients/{created_patient_id}",
                    auth=AUTH,
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
                assert del_response.status_code in [200, 204], \
                    f"Failed to delete patient with id {created_patient_id}, status {del_response.status_code}"
            except Exception:
                # Ignore cleanup exceptions to avoid masking test results
                pass

test_patient_registration_with_valid_cpf()