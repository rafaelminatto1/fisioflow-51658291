import requests
from requests.auth import HTTPBasicAuth

def test_listar_pacientes():
    base_url = "http://localhost:8084"
    endpoint = "/api/pacientes"
    url = base_url + endpoint
    username = "rafael.minatto@yahoo.com.br"
    password = "Yukari30@"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, auth=HTTPBasicAuth(username, password), timeout=30)
        response.raise_for_status()
        data = response.json()
        assert isinstance(data, (list, dict)), "Response JSON is not a list or dict"
        # Further checks depending on expected structure, e.g. list of patients
        if isinstance(data, list):
            for patient in data:
                assert "id" in patient, "Patient record missing 'id'"
                assert "name" in patient or "nome" in patient, "Patient record missing 'name' field"
        elif isinstance(data, dict):
            assert "patients" in data or "data" in data, "Response dict missing expected keys"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_listar_pacientes()