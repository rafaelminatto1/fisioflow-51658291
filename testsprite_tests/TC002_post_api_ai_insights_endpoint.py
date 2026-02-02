import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:8084"
ENDPOINT = "/api/ai/insights"
AUTH_USERNAME = "rafael.minatto@yahoo.com.br"
AUTH_PASSWORD = "Yukari30@"
TIMEOUT = 30


def test_post_api_ai_insights():
    url = BASE_URL + ENDPOINT
    headers = {
        "Content-Type": "application/json"
    }
    # Example valid payload; adapt as needed since no schema details provided
    valid_payload = {
        "patientId": "123456",  # Example patient identifier
        "context": "clinical_history",
        "notes": "Patient experiences mild lower back pain and occasional stiffness."
    }

    # Test successful request
    try:
        response = requests.post(
            url,
            json=valid_payload,
            headers=headers,
            auth=HTTPBasicAuth(AUTH_USERNAME, AUTH_PASSWORD),
            timeout=TIMEOUT
        )
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed unexpectedly: {e}"

    # Validate response content-type JSON
    content_type = response.headers.get("Content-Type", "")
    assert "application/json" in content_type.lower(), f"Unexpected content-type: {content_type}"

    # Validate JSON structure and presence of expected keys in response
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Assuming AI insights returns a field 'insights' which is a non-empty list or dict
    assert "insights" in data, "Response JSON missing 'insights' key"
    assert data["insights"], "'insights' field is empty"

    # Test error case: missing required patientId field
    invalid_payload = {
        "context": "clinical_history",
        "notes": "Missing patientId field."
    }
    try:
        error_response = requests.post(
            url,
            json=invalid_payload,
            headers=headers,
            auth=HTTPBasicAuth(AUTH_USERNAME, AUTH_PASSWORD),
            timeout=TIMEOUT
        )
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed unexpectedly: {e}"

    # Check that the response status code indicates a client error (e.g., 4xx)
    assert 400 <= error_response.status_code < 500, f"Expected 4xx status code for invalid payload, got {error_response.status_code}"

    # Optionally validate error message in response
    try:
        error_data = error_response.json()
        assert "error" in error_data or "message" in error_data, "Error response JSON missing 'error' or 'message' key"
    except ValueError:
        # If not JSON, that's acceptable but log
        pass


test_post_api_ai_insights()