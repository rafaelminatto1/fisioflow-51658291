import requests
from requests.auth import HTTPBasicAuth
import time

BASE_ENDPOINT = "http://localhost:8085"
FRONTEND_URL = "https://moocafisio.com.br"
AUTH_USERNAME = "rafael.minatto@yahoo.com.br"
AUTH_PASSWORD = "Yukari30@"
TIMEOUT = 30

def test_system_performance_page_load_and_api_response_times():
    session = requests.Session()
    session.auth = HTTPBasicAuth(AUTH_USERNAME, AUTH_PASSWORD)
    session.headers.update({"Accept": "application/json"})
    # 1. Measure frontend critical page load times via HTTP GET (simulate some main pages)
    front_pages = [
        "",                         # home page
        "dashboard",
        "agenda",
        "patients",
        "exercises",
        "medical-record"
    ]

    for page in front_pages:
        url = f"{FRONTEND_URL}/{page}"
        start_time = time.time()
        resp = session.get(url, timeout=TIMEOUT)
        load_time = time.time() - start_time
        assert resp.status_code == 200, f"Page {url} did not load successfully, status {resp.status_code}"
        assert load_time < 2.0, f"Page {url} load time {load_time:.2f}s exceeded 2 seconds"

    # 2. Measure backend API endpoints response times (P95 < 500ms) by repeated calls
    # Since the PRD has minimal API endpoints listed, we test /api/ai/chat POST as an example critical backend API
    api_endpoint = f"{BASE_ENDPOINT}/api/ai/chat"
    test_payload = {"message": "Performance test ping"}
    timings = []
    attempted_calls = 20

    for _ in range(attempted_calls):
        start = time.time()
        try:
            resp = session.post(api_endpoint, json=test_payload, timeout=TIMEOUT)
            resp.raise_for_status()
        except Exception as e:
            raise AssertionError(f"API endpoint {api_endpoint} failed with exception: {e}")
        elapsed = (time.time() - start) * 1000  # ms
        timings.append(elapsed)

    timings.sort()
    index_95 = int(len(timings) * 0.95) - 1
    p95_time = timings[index_95]

    assert p95_time < 500, f"P95 response time {p95_time:.2f}ms exceeded 500ms for {api_endpoint}"

test_system_performance_page_load_and_api_response_times()