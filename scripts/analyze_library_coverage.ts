
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCoverage() {
    console.log('Fetching all exercises...');
    const { data: exercises, error } = await supabase
        .from('exercises')
        .select('name, category');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const total = exercises.length;
    console.log(`Total Exercises: ${total}\n`);

    // Define categories by keywords
    const categories = {
        'Knee (Joelho)': ['knee', 'joelho', 'squat', 'agachamento', 'quad', 'hamstring', 'isquio', 'leg', 'perna', 'lunge', 'afundo', 'step'],
        'Shoulder (Ombro)': ['shoulder', 'ombro', 'rotator', 'manguito', 'scap', 'escap', 'pendulum', 'codman', 'elevation', 'elevação', 'arm', 'braço'],
        'Spine/Core (Coluna)': ['spine', 'coluna', 'back', 'costas', 'lumbar', 'lombar', 'crunch', 'abdominal', 'plank', 'prancha', 'bridge', 'ponte', 'cat', 'gato', 'dog', 'cão', 'bird', 'perdigueiro'],
        'Hip (Quadril)': ['hip', 'quadril', 'glute', 'glúteo', 'abduct', 'abdução', 'adduct', 'adução', 'pirif', 'clam'],
        'Ankle/Foot (Tornozelo/Pé)': ['ankle', 'tornozelo', 'foot', 'pé', 'calf', 'panturrilha', 'heel', 'calcanhar', 'toe', 'dedo', 'plantar'],
        'Elbow/Wrist (Cotovelo/Punho)': ['elbow', 'cotovelo', 'wrist', 'punho', 'hand', 'mão', 'finger', 'dedo', 'bicep', 'tricep', 'grip'],
        'Post-Op Specific': ['post', 'pós', 'surg', 'cirurgia', 'pump', 'bombinha', 'bed', 'leito', 'isometric', 'isometria'],
        'Balance/Proprioception': ['balance', 'equilíbrio', 'bosu', 'proprio', 'unipodal', 'single leg', 'tandem', 'star'],
        'Cardio/Aerobic': ['walk', 'caminhada', 'march', 'marcha', 'jack', 'polichinelo', 'rope', 'corda']
    };

    const counts: Record<string, number> = {};
    const tagged = new Set<string>();

    for (const [cat, keywords] of Object.entries(categories)) {
        const matches = exercises.filter(e => {
            const nameLower = e.name.toLowerCase();
            return keywords.some(k => nameLower.includes(k));
        });
        counts[cat] = matches.length;
        matches.forEach(m => tagged.add(m.name));
    }

    // Display Stats
    console.log('--- Coverage by Body Part / Domain ---');
    Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, count]) => {
            const pct = ((count / total) * 100).toFixed(1);
            console.log(`${cat}: ${count} (${pct}%)`);
        });

    // Untagged
    const untagged = exercises.filter(e => !tagged.has(e.name));
    if (untagged.length > 0) {
        console.log(`\n--- Uncategorized / General (${untagged.length}) ---`);
        untagged.slice(0, 10).forEach(e => console.log(`- ${e.name}`));
        if (untagged.length > 10) console.log(`...and ${untagged.length - 10} more`);
    }

    console.log('\n--- Duplicate Check (Fuzzy Name) ---');
    // Simple check for exact name dupes
    const nameCounts: Record<string, number> = {};
    exercises.forEach(e => {
        nameCounts[e.name] = (nameCounts[e.name] || 0) + 1;
    });
    const dupes = Object.entries(nameCounts).filter(([, c]) => c > 1);
    if (dupes.length > 0) {
        console.log('Potential Duplicates found:');
        dupes.forEach(([name, c]) => console.log(`"${name}": ${c} times`));
    } else {
        console.log('No exact name duplicates found.');
    }
}

analyzeCoverage();
