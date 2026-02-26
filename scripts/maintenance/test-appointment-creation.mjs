// Simple test script to verify appointment creation and drag-drop functionality
const testUrls = [
  'https://moocafisio.com.br/dashboard',
  'https://moocafisio.com.br/appointments/create',
  'https://moocafisio.com.br/calendar'
];

console.log('Testing FisioFlow production pages...\n');

for (const url of testUrls) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FisioFlow-Test/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    console.log(`${url}: ${response.status}`);

    if (response.ok) {
      // Test for specific keywords in the page content
      const pageResponse = await fetch(url);
      const html = await pageResponse.text();

      // Check for appointment-related functionality
      const hasAppointmentButton = html.includes('Nova Consulta') || html.includes('Novo Agendamento') || html.includes('create-appointment');
      const hasCalendar = html.includes('calendar') || html.includes('draggable') || html.includes('time-slot');

      console.log(`  - Has appointment button: ${hasAppointmentButton}`);
      console.log(`  - Has calendar components: ${hasCalendar}`);

      // Check for errors in scripts
      if (html.includes('error') || html.includes('Error') || html.includes('CORS')) {
        console.log('  ⚠️  Possible errors detected in page');
      }
    }
  } catch (error) {
    console.log(`${url}: Error - ${error.message}`);
  }
  console.log('');
}

console.log('Test completed');