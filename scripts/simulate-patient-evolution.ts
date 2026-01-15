import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulate() {
    console.log('🚀 Iniciando simulação de evolução do paciente...');

    // 1. Obter um terapeuta (perfil)
    // Hardcoded ID from DB for simulation purposes in CLI (RLS bypass)
    const therapistId = process.env.THERAPIST_ID || '2f3d3584-e17e-46c4-af08-50d618062875';
    console.log(`👤 Usando ID de terapeuta: ${therapistId}`);

    // 2. Criar ou obter paciente de teste
    const testPatientName = 'Paciente Simulado - Evolução 360';
    let { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('full_name', testPatientName)
        .maybeSingle();

    if (patientError || !patient) {
        const { data: newPatient, error: createError } = await supabase
            .from('patients')
            .insert({
                full_name: testPatientName,
                birth_date: '1990-01-01',
                status: 'Em Tratamento',
                phone: '(11) 99999-9999',
                email: 'simulado@fisioflow.com'
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Erro ao criar paciente:', createError);
            return;
        }
        patient = newPatient;
        console.log('✅ Paciente de teste criado.');
    }

    const patientId = patient.id;

    // 3. Simular 10 sessões
    console.log('📅 Simulando 10 sessões...');

    for (let i = 1; i <= 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (11 - i) * 2); // Espaçadas a cada 2 dias
        const dateISO = date.toISOString();

        // A. Criar SOAP Record
        const { data: soap, error: soapError } = await supabase
            .from('soap_records')
            .insert({
                patient_id: patientId,
                record_date: dateISO,
                subjective: `Sessão ${i}: Paciente relata ${i < 5 ? 'muita' : 'alguma'} melhora.`,
                objective: `Realizado alongamento e fortalecimento. Sessão ${i}.`,
                assessment: `Evolução ${i <= 5 ? 'lenta' : 'satisfatória'}.`,
                plan: `Continuar protocolo de reabilitação. Próxima sessão em 2 dias.`,
                pain_level: 10 - i, // Dor diminuindo 10 -> 0
                created_by: therapistId
            })
            .select()
            .single();

        if (soapError) {
            console.error(`❌ Erro no SOAP da sessão ${i}:`, soapError);
            continue;
        }

        // B. Criar Pain Map (Dor Global)
        await supabase.from('pain_maps').insert({
            session_id: soap.id,
            patient_id: patientId,
            global_pain_level: 10 - i,
            created_at: dateISO
        });

        // C. Criar Medições de Evolução
        // 1. Flexão de Joelho (Melhora de 90 para 135)
        const flexaoValue = 90 + (i * 4.5);
        await supabase.from('evolution_measurements').insert({
            patient_id: patientId,
            soap_record_id: soap.id,
            measurement_type: 'Amplitude de Movimento',
            measurement_name: 'Flexão de Joelho (Dir)',
            value: flexaoValue,
            unit: 'graus',
            measured_at: dateISO
        });

        // 2. EVA (Mesmo que a dor do SOAP)
        await supabase.from('evolution_measurements').insert({
            patient_id: patientId,
            soap_record_id: soap.id,
            measurement_type: 'Dor (EVA)',
            measurement_name: 'Escala de Dor',
            value: 10 - i,
            unit: '0-10',
            measured_at: dateISO
        });

        // 3. Sinais Vitais (Variação normal)
        await supabase.from('evolution_measurements').insert({
            patient_id: patientId,
            soap_record_id: soap.id,
            measurement_type: 'Sinais Vitais',
            measurement_name: 'Checkup de Sinais',
            value: 0,
            custom_data: {
                bp: `${120 + Math.floor(Math.random() * 10)}/${80 + Math.floor(Math.random() * 5)}`,
                hr: (70 + Math.floor(Math.random() * 10)).toString(),
                spo2: '98',
                rr: (16 + Math.floor(Math.random() * 2)).toString(),
                temp: (36.5 + Math.random() * 0.5).toFixed(1)
            },
            measured_at: dateISO
        });

        console.log(`✅ Sessão ${i}/10 concluída.`);
    }

    console.log('\n✨ Simulação finalizada com sucesso!');
    console.log(`📍 Paciente: ${testPatientName}`);
    console.log(`🆔 ID: ${patientId}`);
    console.log('---');
    console.log('Agora você pode abrir o relatório deste paciente no sistema.');
}

simulate();
