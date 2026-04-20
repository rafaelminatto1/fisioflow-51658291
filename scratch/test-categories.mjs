async function testCategories() {
  const url = "https://fisioflow-api.rafalegollas.workers.dev/api/exercises/categories";
  try {
    console.log(`Fetching ${url}...`);
    const resp = await fetch(url);
    console.log("Status:", resp.status);
    const body = await resp.text();
    console.log("Body length:", body.length);
    console.log("Body preview:", body.substring(0, 100));
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}

testCategories();
