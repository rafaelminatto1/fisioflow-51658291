
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables correctly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Setup globals for client compatibility
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Mock import.meta.env
(global as any).import = {
    meta: {
        env: {
            VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
            VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
            GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
            DEV: true
        }
    }
};

async function verifySearch() {
    const { exerciseEmbedding } = await import('../src/lib/vector/embeddings');

    console.log('🔍 Testing Semantic Search with Gemini...');
    try {
        const results = await exerciseEmbedding.searchExercises('dor lombar', { limit: 3, threshold: 0.1 });
        console.log(`✅ Found ${results.length} results for "dor lombar"`);
        results.forEach(r => {
            console.log(`- ${r.data.name} (Similarity: ${r.similarity.toFixed(4)})`);
        });
    } catch (error) {
        console.error('❌ Search failed:', error);
    }
}

verifySearch();
