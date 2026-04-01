import { config } from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
    config({ path: '.env.local' });
} else if (fs.existsSync('.env')) {
    config({ path: '.env' });
} else {
    config();
}
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './db/schema.ts',
    out: './db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.POSTGRES_URL!,
    },
    schemaFilter: ["fawredd_gym"],
});
