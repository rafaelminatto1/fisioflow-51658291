async function testApi() {
  const url = "https://fisioflow-api.rafalegollas.workers.dev/api/exercises?limit=500";
  try {
    console.log(`Fetching ${url}...`);
    const resp = await fetch(url);
    console.log("Status:", resp.status);
    const body = await resp.text();
    console.log("Body:", body.substring(0, 1000));
    if (body.length > 1000) console.log("...");
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}

testApi();
