import { supabase } from './src/integrations/supabase/client.ts';

async function checkBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error listing buckets:', error);
        process.exit(1);
    }
    console.log('Existing buckets:', data.map(b => b.name));
    const hasPatientDocuments = data.some(b => b.name === 'patient-documents');
    if (hasPatientDocuments) {
        console.log('✓ patient-documents bucket exists');
    } else {
        console.log('✗ patient-documents bucket does NOT exist - needs to be created manually');
    }
}

checkBuckets().catch(console.error);
