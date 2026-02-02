import requests
from requests.auth import HTTPBasicAuth

def test_login_api():
    base_url = "http://localhost:8084"
    login_endpoint = f"{base_url}/login"
    username = "rafael.minatto@yahoo.com.br"
    password = "Yukari30@"
    timeout = 30

    try:
        response = requests.post(login_endpoint, auth=HTTPBasicAuth(username, password), timeout=timeout)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        assert False, f"Login request failed: {e}"

    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    # Assuming the login returns a JSON with a token or success message
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "token" in data or "success" in data, "Login response JSON does not contain expected keys"

test_login_api()