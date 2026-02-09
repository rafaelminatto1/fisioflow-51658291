import requests

BASE_URL = "https://moocafisio.com.br"
ENDPOINT = "/api/ai/chat"
TIMEOUT = 30


def test_post_api_ai_chat_endpoint():
    url = f"{BASE_URL}{ENDPOINT}"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # Valid payload example for chat request
    valid_payload = {
        "message": "Paciente queixa de dor lombar crônica, qual sugestão clínica?"
    }

    # Invalid payload example (empty message)
    invalid_payload = {
        "message": ""
    }

    # Test valid request
    try:
        response = requests.post(
            url,
            json=valid_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert response.status_code == 200, f"Expected 200 OK but got {response.status_code}"
        content_type = response.headers.get('Content-Type', '')
        assert 'application/json' in content_type, f"Expected JSON response but got {content_type}"
        response_json = response.json()
        assert isinstance(response_json, dict), "Response is not a JSON object"
    except Exception as e:
        assert False, f"Valid request test failed: {e}"

    # Test invalid request
    try:
        response = requests.post(
            url,
            json=invalid_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert 400 <= response.status_code < 500, \
            f"Expected client error status (4xx) but got {response.status_code}"
        content_type = response.headers.get('Content-Type', '')
        if response.content:
            assert 'application/json' in content_type, f"Expected JSON error response but got {content_type}"
            resp_json = response.json()
            assert "error" in resp_json or "message" in resp_json, "Error response missing expected keys"
    except Exception as e:
        assert False, f"Invalid request test failed: {e}"


test_post_api_ai_chat_endpoint()
