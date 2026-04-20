async function testHealth() {
  const url = "https://fisioflow-api.rafalegollas.workers.dev/api/health/db";
  try {
    console.log(`Fetching ${url}...`);
    const resp = await fetch(url);
    console.log("Status:", resp.status);
    const body = await resp.text();
    console.log("Body:", body);
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}

testHealth();
