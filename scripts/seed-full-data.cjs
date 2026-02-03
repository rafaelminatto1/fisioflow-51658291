/**
 * Seed Full Data (Replica of SeedData.tsx)
 * Run with: node scripts/seed-full-data.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

// Initialize Firebase
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'fisioflow-migration'
    });
}

const db = admin.firestore();

// Helper for dates
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function subDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
}

function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function generateDates(count) {
    const dates = [];
    let currentDate = subDays(new Date(), count * 3);

    // Adjust to next Monday if weekend
    while (isWeekend(currentDate)) {
        currentDate = addDays(currentDate, 1);
    }

    while (dates.length < count) {
        if (!isWeekend(currentDate)) { // Only weekdays
            dates.push(currentDate.toISOString().split('T')[0]);
        }

        // Skip 1 day (Mon -> Wed -> Fri)
        const day = currentDate.getDay();
        if (day === 5) { // Friday -> Mon
            currentDate = addDays(currentDate, 3);
        } else {
            currentDate = addDays(currentDate, 2);
        }
    }
    return dates;
}

async function seed() {
    const orgId = 'default-org'; // Hardcoded as per fix-user-auth
    const userId = 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2'; // The specific user ID

    console.log(`🌱 Starting Full Data Seeding for Org: ${orgId}...`);

    for (let i = 1; i <= 10; i++) {
        const patientName = `Paciente Teste ${String(i).padStart(2, '0')}`;
        console.log(`\nProcessing: ${patientName}...`);

        try {
            // 1. Create Patient
            const patientData = {
                name: patientName,
                full_name: patientName,
                email: `paciente${Date.now()}_${i}@teste.com`,
                phone: `119${Math.floor(Math.random() * 100000000)}`,
                status: 'Em Tratamento',
                organization_id: orgId,
                birth_date: '1990-01-01',
                gender: ' outro ', // aligned with SeedData.tsx
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                active_plans: 1, // Mock
                treatment_sessions: 10 // Mock
            };

            const patientRef = await db.collection('patients').add(patientData);
            const patientId = patientRef.id;
            console.log(`   ✅ Created Patient: ${patientId}`);

            // 2. Generate Dates
            const dates = generateDates(11); // 1 eval + 10 evols
            const evalDate = dates[0];
            const evolutionDates = dates.slice(1);

            // 3. Create Evaluation (SOAP Record)
            await db.collection('soap_records').add({
                patient_id: patientId,
                session_id: `seed-eval-${patientId}`,
                session_date: evalDate,
                session_number: 1,
                subjective: "Paciente relata dor lombar crônica irradiando para perna direita. Início há 3 meses.",
                objective: "Teste de Lasègue positivo a 45 graus. Amplitude de movimento reduzida em flexão lombar.",
                assessment: "Lombociatalgia à direita. Encurtamento de isquiotibiais.",
                plan: "Cinesioterapia, terapia manual, fortalecimento de core.",
                created_by: userId,
                pain_level: 8 + (Math.random() * 2 - 1),
                evolution_notes: "Avaliação inicial completa.",
                test_results: [],
                type: 'Avaliação', // Inferred
                organization_id: orgId,
                created_at: new Date().toISOString()
            });
            console.log(`   ✅ Created Evaluation: ${evalDate}`);

            // 4. Create Evolutions
            let currentPain = 8;
            let functionalScore = 40;

            for (let j = 0; j < evolutionDates.length; j++) {
                const date = evolutionDates[j];
                const sessionNum = j + 2;

                if (i % 2 !== 0) {
                    currentPain = Math.max(0, currentPain - 0.7);
                    functionalScore = Math.min(100, functionalScore + 5);
                } else {
                    currentPain = Math.max(5, currentPain - 0.1);
                    functionalScore = Math.min(60, functionalScore + 1);
                }
                const painRounded = Math.round(currentPain);

                // SOAP Record
                await db.collection('soap_records').add({
                    patient_id: patientId,
                    session_id: `seed-evol-${patientId}-${sessionNum}`,
                    session_date: date,
                    session_number: sessionNum,
                    subjective: "Paciente relata melhora gradual.",
                    objective: "Melhora na amplitude de movimento.",
                    assessment: "Evolução positiva.",
                    plan: "Manter conduta.",
                    created_by: userId,
                    pain_level: painRounded,
                    evolution_notes: `Sessão de rotina ${sessionNum}.`,
                    test_results: [
                        {
                            test_name: "Flexão Lombar",
                            test_type: "rom",
                            value: functionalScore,
                            unit: "graus",
                            patient_id: patientId,
                            measured_at: date,
                            measured_by: userId,
                            id: `temp-id-${j}`,
                            session_id: `temp-session-${j}`,
                            created_at: new Date().toISOString()
                        }
                    ],
                    type: 'Evolução',
                    organization_id: orgId,
                    created_at: new Date().toISOString()
                });

                // Treatment Session (for stats)
                await db.collection('treatment_sessions').add({
                    patient_id: patientId,
                    therapist_id: userId,
                    appointment_id: `seed-evol-${patientId}-${sessionNum}`,
                    session_date: new Date(date).toISOString(),
                    session_type: 'treatment',
                    pain_level_before: Math.min(10, painRounded + 1),
                    pain_level_after: Math.max(0, painRounded - 1),
                    functional_score_before: functionalScore - 1,
                    functional_score_after: functionalScore,
                    exercises_performed: [],
                    observations: "Evolução padrão seed.",
                    status: 'completed',
                    created_by: userId,
                    updated_at: new Date().toISOString(),
                    organization_id: orgId
                });
            }
            console.log(`   ✅ Created ${evolutionDates.length} Evolutions`);

        } catch (err) {
            console.error(`   ❌ Failed: ${err.message}`);
        }
    }

    console.log('\n✨ DONE! Check Dashboard.');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
