import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:8084"
USERNAME = "rafael.minatto@yahoo.com.br"
PASSWORD = "Yukari30@"
TIMEOUT = 30

def test_post_api_ai_recommendations():
    url = f"{BASE_URL}/api/ai/recommendations"
    headers = {
        "Content-Type": "application/json"
    }
    auth = HTTPBasicAuth(USERNAME, PASSWORD)
    
    # Valid payload example (the schema was not detailed, so assume a typical input)
    valid_payload = {
        "patientId": "123456789",
        "context": "patient recent injury and treatment history"
    }
    # Sending valid request
    try:
        response = requests.post(url, json=valid_payload, headers=headers, auth=auth, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} with valid payload failed with exception: {e}"
    
    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"
    try:
        data = response.json()
    except Exception:
        assert False, "Response is not a valid JSON"
    # Validate that response contains recommendations field (likely list or dict)
    assert isinstance(data, dict), "Response JSON should be a dictionary"
    assert "recommendations" in data, "Response JSON missing 'recommendations' key"
    assert isinstance(data["recommendations"], (list, dict)), "'recommendations' should be a list or dictionary"

    # Invalid payloads to test error handling
    invalid_payloads = [
        None,
        {},
        {"patientId": ""},
        {"unexpectedField": "value"}
    ]

    for invalid_payload in invalid_payloads:
        try:
            resp = requests.post(url, json=invalid_payload, headers=headers, auth=auth, timeout=TIMEOUT)
        except requests.RequestException as e:
            assert False, f"Request to {url} with invalid payload {invalid_payload} failed with exception: {e}"
        assert resp.status_code >= 400, (
            f"Expected client error status code >=400 for payload {invalid_payload} but got {resp.status_code}"
        )

test_post_api_ai_recommendations()