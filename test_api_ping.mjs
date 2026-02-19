import fetch from 'node-fetch';

async function test() {
  const urls = [
    'https://southamerica-east1-fisioflow-migration.cloudfunctions.net/appointmentServiceHttp',
    'https://southamerica-east1-fisioflow-migration.cloudfunctions.net/patientServiceHttp'
  ];

  for (const url of urls) {
    try {
      const response = await fetch(`${url}?action=ping`);
      const text = await response.text();
      console.log(`Ping ${url}: ${response.status} - ${text}`);
    } catch (e) {
      console.log(`Error pinging ${url}: ${e.message}`);
    }
  }
}

test();
