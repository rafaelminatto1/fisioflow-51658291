import requests
from requests.auth import HTTPBasicAuth

def test_post_api_ai_chat_endpoint():
    base_url = "http://localhost:8084"
    endpoint = "/api/ai/chat"
    url = base_url + endpoint

    auth = HTTPBasicAuth("rafael.minatto@yahoo.com.br", "Yukari30@")
    headers = {"Content-Type": "application/json"}

    # Valid request payload - API expects messages array per api/ai/chat/route.ts
    valid_payload = {
        "messages": [
            {"role": "user", "content": "What are the clinical suggestions for a patient with lower back pain?"}
        ]
    }

    # Invalid request payload example (empty or wrong type)
    invalid_payload = "this should be an object, not a string"

    # Test valid request
    try:
        response = requests.post(url, json=valid_payload, headers=headers, auth=auth, timeout=30)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        json_response = response.json()
        # Check if response is JSON object and contains keys typical for AI clinical suggestions (best effort)
        assert isinstance(json_response, dict), "Response JSON is not an object"
        # Assume response should have a 'suggestions' or similar key representing clinical suggestions
        assert any(key in json_response for key in ('suggestions', 'response', 'answers', 'message')), \
            "Response does not contain expected AI suggestion keys"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed with exception: {e}"

    # Test invalid request
    try:
        response_invalid = requests.post(url, data=invalid_payload, headers=headers, auth=auth, timeout=30)
        # Expecting client error for invalid input (400 Bad Request or similar)
        assert response_invalid.status_code >= 400 and response_invalid.status_code < 500, \
            f"Expected client error status code for invalid input, got {response_invalid.status_code}"
    except requests.exceptions.RequestException as e:
        assert False, f"Request with invalid payload failed with exception: {e}"

test_post_api_ai_chat_endpoint()