import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "https://moocafisio.com.br"
AUTH = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}
TIMEOUT = 30

def test_post_api_ai_recommendations():
    url = f"{BASE_URL}/api/ai/recommendations"

    # Use minimal valid payload (empty object as per PRD schema)
    valid_payload = {}

    # Test successful request
    try:
        response = requests.post(url, json=valid_payload, headers=HEADERS, auth=AUTH, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    if response.content:
        try:
            json_response = response.json()
        except ValueError:
            assert False, "Response is not valid JSON"

        # Expecting JSON object response
        assert isinstance(json_response, dict), "Response JSON is not a dictionary"
    else:
        assert False, "Response body is empty"

    # Test invalid request (e.g., unexpected fields)
    invalid_payload = {
        "unexpected_field": "invalid_value"
    }

    try:
        error_response = requests.post(url, json=invalid_payload, headers=HEADERS, auth=AUTH, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request failed on invalid input test: {e}"

    # We expect a 4xx client error due to invalid request payload
    assert 400 <= error_response.status_code < 500, f"Expected 4xx error, got {error_response.status_code}"

    if error_response.content:
        try:
            error_json = error_response.json()
        except ValueError:
            assert False, "Error response is not valid JSON"

        # Check error message or error structure presence
        assert "error" in error_json or "message" in error_json, "Error response missing expected 'error' or 'message' key"
    else:
        assert False, "Error response body is empty"


test_post_api_ai_recommendations()
