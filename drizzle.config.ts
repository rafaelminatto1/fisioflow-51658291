import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/server/db/schema/*',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_DIRECT_URL!,
        connectTimeout: 10000,
        idleTimeout: 20000,
    },
    // Otimizações para Neon/Remote DB
    tablesFilter: ['*'],
    verbose: false,
    strict: true,
});
