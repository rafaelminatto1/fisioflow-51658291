import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from './src/integrations/firebase/app.ts';
import { appointmentsApi } from './src/integrations/firebase/functions.ts';

async function testFetch() {
    console.log('1. Autenticando...');
    const auth = getAuth(app);
    try {
        const cred = await signInWithEmailAndPassword(auth, 'REDACTED_EMAIL', 'REDACTED');
        console.log('Auth success:', cred.user.uid);

        // Test AppointmentService.fetchAppointments
         // Need to specify org ID or fetch it... let's just get the user's profile first

        // Actually we can just call appointmentsApi.list directly
        console.log('2. Chamando appointmentsApi.list()...');
        const res = await appointmentsApi.list({ limit: 50, dateFrom: '2026-02-15' });
        console.log('API RESPONSE SUCCESS');
        console.log('Keys:', Object.keys(res));
        console.log('Items:', res.data?.length);
        if (res.data && res.data.length > 0) {
            console.log('Sample item:', res.data[0].id, res.data[0].date, res.data[0].start_time);
        }
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        process.exit(0);
    }
}

testFetch();
