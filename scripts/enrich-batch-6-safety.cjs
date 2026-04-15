const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true";

const enrichmentData = [
    {
        slug: 'alongamento-romboides-sentado',
        precautions: 'Evitar se houver hérnia de disco cervical aguda ou dor aguda na escápula.',
        benefits: 'Melhora a mobilidade torácica, reduz a tensão no trapézio e romboides.'
    },
    {
        slug: 'bicep-curl-martelo',
        precautions: 'Evitar hiperextensão do cotovelo; cautela em casos de epicondilite lateral.',
        benefits: 'Fortalece o braquial e braquiorradial, melhorando a força de preensão.'
    },
    {
        slug: 'alongamento-subescapular',
        precautions: 'Não realizar se houver síndrome do impacto do ombro severa ou luxação recente.',
        benefits: 'Melhora a rotação externa do ombro e alivia tensões na face anterior da articulação.'
    },
    {
        slug: 'alongamento-tensor-fascia-lata',
        precautions: 'Cautela em pacientes com instabilidade de quadril ou bursite trocantérica aguda.',
        benefits: 'Reduz a tensão na lateral da coxa e melhora o alinhamento da pelve.'
    },
    {
        slug: 'alongamento-triceps-sentado',
        precautions: 'Evitar se houver dor aguda no ombro ou restrição severa de amplitude.',
        benefits: 'Melhora a flexão do ombro e a elasticidade do complexo do braço.'
    },
    {
        slug: 'alongamento-triceps-toalha',
        precautions: 'Não forçar se houver dor no manguito rotador.',
        benefits: 'Combina mobilidade de ombro com alongamento de tríceps, sendo útil para pós-operatórios tardios.'
    },
    {
        slug: 'barra-fixa-pronada',
        precautions: 'Exercício de alta intensidade; evitar em casos de lesões agudas nos ombros ou cotovelos.',
        benefits: 'Fortalecimento global de dorsais, bíceps e estabilizadores da escápula.'
    },
    {
        slug: 'avanco-com-salto',
        precautions: 'Alto impacto articular; contraindicado para lesões agudas de menisco ou LCA sem reabilitação avançada.',
        benefits: 'Aumenta a potência muscular, coordenação motora e estabilidade unipodal.'
    },
    {
        slug: 'avanco-reverso-halteres',
        precautions: 'Manter o alinhamento do joelho para evitar estresse no ligamento colateral.',
        benefits: 'Fortalece glúteo máximo e quadríceps com menor estresse na patela que o avanço frontal.'
    },
    {
        slug: 'avanco-com-halteres',
        precautions: 'Cuidado com o equilíbrio; manter o tronco ereto para evitar sobrecarga lombar.',
        benefits: 'Excelente para estabilidade dinâmica e fortalecimento de membros inferiores.'
    },
    {
        slug: 'alongamento-triceps-parede',
        precautions: 'Evitar se houver sintomas de compressão nervosa no braço.',
        benefits: 'Alongamento profundo e estável, fácil de realizar de forma autônoma.'
    },
    {
        slug: 'bicep-curl-alternado',
        precautions: 'Não balance o corpo; mantenha a coluna neutra.',
        benefits: 'Isola o bíceps braquial e trabalha a supinação do antebraço.'
    },
    {
        slug: 'ankle-inversion-isometric',
        precautions: 'Cautela em entorses muito recentes (fase inflamatória aguda).',
        benefits: 'Fortalece o tibial posterior, essencial para sustentar o arco plantar e prevenir entorses.'
    },
    {
        slug: 'barra-fixa-supinada',
        precautions: 'Monitorar tensão nos cotovelos e punhos.',
        benefits: 'Enfatiza o bíceps braquial e os flexores do antebraço.'
    },
    {
        slug: 'avanco-isometrico',
        precautions: 'Evitar se houver dor fêmoro-patelar aguda.',
        benefits: 'Aumenta a resistência muscular e a estabilidade articular sem o impacto do movimento.'
    }
];

async function enrich() {
    const sql = neon(DATABASE_URL);
    try {
        console.log('🚀 Iniciando enriquecimento de precauções e benefícios para o Batch 6...');

        for (const exercise of enrichmentData) {
            const res = await sql`
                UPDATE exercises 
                SET precautions = ${exercise.precautions}, benefits = ${exercise.benefits}
                WHERE slug = ${exercise.slug} 
                RETURNING name
            `;
            if (res.length > 0) {
                console.log(`✅ Atualizado: ${res[0].name} (${exercise.slug})`);
            } else {
                console.warn(`⚠️ Exercício não encontrado: ${exercise.slug}`);
            }
        }

        console.log('✨ Enriquecimento de segurança e benefícios concluído!');
    } catch (err) {
        console.error('❌ Erro durante o enriquecimento:', err);
    }
}

enrich();
