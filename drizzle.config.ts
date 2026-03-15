import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/server/db/schema/*',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    // Otimizações para Neon/Remote DB
    caching: true,
    verbose: true,
    strict: true,
});
