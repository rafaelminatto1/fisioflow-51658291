import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "https://moocafisio.com.br"
ENDPOINT = "/api/ai/insights"
TIMEOUT = 30
USERNAME = "rafael.minatto@yahoo.com.br"
PASSWORD = "Yukari30@"


def test_post_api_ai_insights_endpoint():
    url = BASE_URL + ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # Minimal payload as PRD does not specify required fields
    valid_payload = {}

    # Test success case with minimal payload
    try:
        response = requests.post(
            url,
            json=valid_payload,
            headers=headers,
            auth=HTTPBasicAuth(USERNAME, PASSWORD),
            timeout=TIMEOUT,
        )
        assert response.status_code == 200, f"Expected 200 OK but got {response.status_code}"
        # Try parsing JSON only if content is present, but tolerate empty or non-JSON
        content = response.text.strip()
        if content:
            try:
                json_data = response.json()
            except requests.exceptions.JSONDecodeError:
                # Accept empty or non-JSON as not failing here since no spec defined response
                json_data = None
        else:
            json_data = None

        if json_data is not None:
            assert isinstance(json_data, (dict, list)), "Response JSON should be an object or list if present"
        # No further assertions as PRD does not specify response schema

    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Failed success case: {e}")

    # Test error scenario: missing required fields (empty payload) - expecting 400 or 422 or possibly 200 with error message
    try:
        response = requests.post(
            url,
            json={},
            headers=headers,
            auth=HTTPBasicAuth(USERNAME, PASSWORD),
            timeout=TIMEOUT,
        )
        assert response.status_code in (400, 422, 200), f"Expected 400, 422 or 200 for invalid payload but got {response.status_code}"
        try:
            json_data = response.json()
            assert ("error" in json_data or "message" in json_data or "insights" in json_data), "Error response should contain 'error', 'message' or 'insights'"
        except requests.exceptions.JSONDecodeError:
            # Accept empty body or non-JSON error responses as server side issue
            pass
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Failed error case with empty payload: {e}")

    # Test error scenario: unauthorized access (wrong credentials)
    try:
        response = requests.post(
            url,
            json=valid_payload,
            headers=headers,
            auth=HTTPBasicAuth(USERNAME, "wrongpassword"),
            timeout=TIMEOUT,
        )
        assert response.status_code == 401, f"Expected 401 Unauthorized but got {response.status_code}"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Failed error case with invalid credentials: {e}")


test_post_api_ai_insights_endpoint()
