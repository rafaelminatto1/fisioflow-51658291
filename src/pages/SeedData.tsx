import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/integrations/firebase/functions';
import { SessionEvolutionService } from '@/lib/services/sessionEvolutionService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addDays, subDays, startOfWeek, isWeekend, format } from 'date-fns';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/integrations/firebase/app';

export default function SeedData() {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const generateDates = (count: number) => {
        const dates: string[] = [];
        let currentDate = subDays(new Date(), count * 3); // Start roughly back enough

        // Adjust to next Monday if weekend
        while (isWeekend(currentDate)) {
            currentDate = addDays(currentDate, 1);
        }

        while (dates.length < count) {
            if (!isWeekend(currentDate)) {
                dates.push(currentDate.toISOString().split('T')[0]);
            }
            // Skip 1 day (Mon -> Wed -> Fri)
            // If Mon (1) + 2 = Wed (3)
            // If Wed (3) + 2 = Fri (5)
            // If Fri (5) + 3 = Mon (1) next week
            const day = currentDate.getDay();
            if (day === 5) { // Friday
                currentDate = addDays(currentDate, 3);
            } else {
                currentDate = addDays(currentDate, 2);
            }
        }
        return dates;
    };

    const handleSeed = async () => {
        if (!user) {
            toast.error('Você precisa estar logado!');
            addLog('❌ Falha: Usuário deve estar logado.');
            return;
        }

        const orgId = profile?.organization_id || 'default-org';

        setLoading(true);
        setLogs([]);
        addLog(`Iniciando o processo de seeding (Org: ${orgId})...`);

        try {

            for (let i = 1; i <= 10; i++) {
                const patientName = `Paciente Teste ${String(i).padStart(2, '0')}`;
                addLog(`Criando paciente: ${patientName}...`);

                let patientId;
                try {
                    const patientData = {
                        name: patientName,
                        full_name: patientName,
                        email: `paciente${Date.now()}_${i}@teste.com`,
                        phone: `119${Math.floor(Math.random() * 100000000)}`,
                        status: 'Em Tratamento',
                        organization_id: orgId,
                        birth_date: '1990-01-01',
                        gender: 'outro'
                    };

                    // Try via API first
                    const newPatient = await api.patients.create(patientData);
                    patientId = newPatient.id;
                    addLog(`✅ Paciente criado via API: ${patientName} (${patientId})`);
                } catch (err) {
                    addLog(`⚠️ Erro ao criar via API: ${err instanceof Error ? err.message : 'Erro desconhecido'}. Tentando via Firestore direto...`);

                    // Fallback via Firestore
                    try {
                        const patientData = {
                            name: patientName,
                            full_name: patientName,
                            email: `paciente${Date.now()}_${i}@teste.com`,
                            phone: `119${Math.floor(Math.random() * 100000000)}`,
                            status: 'Em Tratamento',
                            organization_id: orgId,
                            birth_date: '1990-01-01',
                            gender: 'outro'
                        };
                        const docRef = await addDoc(collection(db, 'patients'), {
                            ...patientData,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        });
                        patientId = docRef.id;
                        addLog(`✅ Paciente criado via Firestore: ${patientName} (${patientId})`);
                    } catch (fsErr) {
                        addLog(`❌ Falha total ao criar paciente: ${fsErr instanceof Error ? fsErr.message : 'Erro desconhecido'}`);
                        continue;
                    }
                }

                if (!patientId) continue;

                // 2. Create Initial Evaluation (Assessment)
                // We simulate an assessment as a simple SOAP record with type "Consulta Inicial" style or just first SOAP.
                // Or we can try creating a `patient_assessments` doc if we knew the schema.
                // Given existing code, creating a SOAP record with comprehensive data simulates an evaluation well enough for the user's progress report request.

                const dates = generateDates(11); // 1 evaluation + 10 evolutions
                const evalDate = dates[0];
                const evolutionDates = dates.slice(1);

                // Evaluation
                addLog(`   Criando avaliação inicial em ${evalDate}...`);

                // Simulating create evaluation via SOAP record (as 'Avaliação' implies comprehensive input)
                // For distinct "Evaluation", we might put subjective as "Anamnese completa..."
                await SessionEvolutionService.saveSessionEvolution({
                    patient_id: patientId,
                    session_id: `seed-eval-${patientId}`,
                    session_date: evalDate,
                    session_number: 1,
                    subjective: "Paciente relata dor lombar crônica irradiando para perna direita. Início há 3 meses.",
                    objective: "Teste de Lasègue positivo a 45 graus. Amplitude de movimento reduzida em flexão lombar.",
                    assessment: "Lombociatalgia à direita. Encurtamento de isquiotibiais.",
                    plan: "Cinesioterapia, terapia manual, fortalecimento de core.",
                    created_by: user.uid,
                    pain_level: 8 + (Math.random() * 2 - 1), // start high (7-9)
                    evolution_notes: "Avaliação inicial completa.",
                    test_results: []
                });


                // 3. Create 10 Evolutions
                let currentPain = 8;
                let functionalScore = 40;

                for (let j = 0; j < evolutionDates.length; j++) {
                    const date = evolutionDates[j];
                    const sessionNum = j + 2; // 1 was eval

                    // Trend: Improve (decrease pain, increase func score) for most, flatten for some.
                    // Let's make odd patients improve well, even patients struggle (to show variety in report).

                    if (i % 2 !== 0) {
                        // Good progress
                        currentPain = Math.max(0, currentPain - 0.7);
                        functionalScore = Math.min(100, functionalScore + 5);
                    } else {
                        // Bad/Slow progress
                        currentPain = Math.max(5, currentPain - 0.1);
                        functionalScore = Math.min(60, functionalScore + 1);
                    }

                    const painRounded = Math.round(currentPain);

                    await SessionEvolutionService.saveSessionEvolution({
                        patient_id: patientId,
                        session_id: `seed-evol-${patientId}-${sessionNum}`,
                        session_date: date,
                        session_number: sessionNum,
                        subjective: "Paciente relata melhora gradual.",
                        objective: "Melhora na amplitude de movimento. Diminuição da tensão muscular.",
                        assessment: "Evolução positiva.",
                        plan: "Manter conduta.",
                        created_by: user.uid,
                        pain_level: painRounded,
                        evolution_notes: `Sessão de rotina ${sessionNum}.`,
                        // Add some test results to show graphs
                        test_results: [
                            {
                                test_name: "Flexão Lombar",
                                test_type: "rom",
                                value: functionalScore, // iterating score
                                unit: "graus",
                                patient_id: patientId,
                                notes: "",
                                measured_at: date,
                                measured_by: user.uid,
                                id: 'temp-id',
                                session_id: 'temp-session',
                                created_at: new Date().toISOString()
                            }
                        ] as Array<{ id: string }> // Cast to avoid strict type checks on ID which is generated backend
                    });

                    // Also create entry in `treatment_sessions` to mirror `usePatientEvolution.firebase.ts` logic?
                    // `SessionEvolutionService` only writes to `soap_records`.
                    // But `usePatientEvolution.firebase.ts` writes to `treatment_sessions` too.
                    // I should duplicate to `treatment_sessions` to ensure all views work.
                    await addDoc(collection(db, 'treatment_sessions'), {
                        patient_id: patientId,
                        therapist_id: user.uid,
                        appointment_id: `seed-evol-${patientId}-${sessionNum}`,
                        session_date: new Date(date).toISOString(), // Ensure ISO
                        session_type: 'treatment',
                        pain_level_before: Math.min(10, painRounded + 1),
                        pain_level_after: Math.max(0, painRounded - 1),
                        functional_score_before: functionalScore - 1,
                        functional_score_after: functionalScore,
                        exercises_performed: [],
                        observations: "Evolução padrão seed.",
                        status: 'completed',
                        created_by: user.uid,
                        updated_at: new Date().toISOString(),
                    });

                    addLog(`   - Evolução ${sessionNum} criada (${date}) - Dor: ${painRounded}`);
                }
            }

            toast.success('Processo concluído!');
            addLog('PROCESS COMPLETED SUCCESSFULLY.');

        } catch (error) {
            console.error(error);
            addLog(`❌ ERRO FATAL: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            toast.error('Erro ao processar seeding.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Seed Data Generator</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">
                        Este utilitário irá gerar:<br />
                        - 10 Pacientes<br />
                        - 1 Avaliação completa para cada<br />
                        - 10 Evoluções (Seg/Qua/Sex) para cada<br />
                        - Dados variados de dor e progresso
                    </p>

                    <Button onClick={handleSeed} disabled={loading} size="lg">
                        {loading ? 'Processando...' : 'GERAR DADOS (10 Pacientes)'}
                    </Button>

                    <div className="mt-8 bg-slate-100 p-4 rounded-md h-96 overflow-y-auto font-mono text-xs">
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1">{log}</div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
