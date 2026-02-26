const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const modulePath =
  process.env.MODULE_PATH ||
  '/src/components/evolution/v3-notion/NotionEvolutionPanel.tsx';
const url = `${baseUrl}${modulePath}?t=${Date.now()}`;

const run = async () => {
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'text/javascript, application/javascript, */*;q=0.8'
      }
    });

    const body = await res.text();
    const ok = res.ok && body && !body.includes('Not Found');

    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status}`);
    console.log(`OK: ${ok}`);
    if (!ok) {
      console.log('Body preview:');
      console.log(body.slice(0, 400));
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fetch failed:', err?.message || err);
    process.exitCode = 1;
  }
};

run();
