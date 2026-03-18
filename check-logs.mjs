import 'dotenv/config';

async function run() {
  const axiomToken = process.env.AXIOM_TOKEN;
  const axiomOrgId = process.env.AXIOM_ORG_ID;
  const dataset = process.env.AXIOM_DATASET || 'fisioflow-logs';
  
  if (!axiomToken || !axiomOrgId) {
    console.error('AXIOM_TOKEN or AXIOM_ORG_ID missing');
    return;
  }

  const axiomEndpoint = `https://api.axiom.co/v1/datasets/${dataset}/query`;
  
  console.log('--- CHECKING RECENT 500 ERRORS IN AXIOM ---');
  
  try {
    const res = await fetch(axiomEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${axiomToken}`,
        'X-Axiom-Org-ID': axiomOrgId,
      },
      body: JSON.stringify({
        "apl": "['${dataset}'] | where statusCode >= 500 | count",
        "startTime": "2026-03-18T00:00:00Z",
        "endTime": "2026-03-18T23:59:59Z"
      })
    });
    
    if (!res.ok) {
      console.error('Axiom query failed:', res.status, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log('Recent 500 Errors Count:', JSON.stringify(data, null, 2));
    
  } catch (e) {
    console.error('Error querying Axiom:', e.message);
  }
}
run();
