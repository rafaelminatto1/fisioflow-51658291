import { config } from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// Carregar .env
config({ path: path.resolve(process.cwd(), '.env') });

const serviceAccount = JSON.parse(fs.readFileSync(new URL('./firebase-service-account.json', import.meta.url)));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkRecentAppointments() {
    console.log("Consultando agendamentos recentes...");
    const snapshot = await db.collection('appointments')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

    if (snapshot.empty) {
        console.log("Nenhum agendamento encontrado.");
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`Paciente: ${data.patientName}`);
        console.log(`Data: ${data.date}`);
        console.log(`Hora: ${data.time}`);
        console.log(`Criado em: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'N/A'}`);
        console.log('------------------------');
    });
}

checkRecentAppointments().catch(console.error);
