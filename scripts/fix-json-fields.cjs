const { Client } = require('pg');

const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

function fixJsonArrayString(str) {
    if (!str || typeof str !== 'string') return str;
    let fixed = str.trim();
    if (fixed.startsWith('{') && fixed.endsWith('}')) {
        fixed = '[' + fixed.substring(1, fixed.length - 1) + ']';
    }
    try {
        // Test parsing to confirm it's valid JSON
        JSON.parse(fixed);
        return fixed;
    } catch (e) {
        return null;
    }
}

async function run() {
    try {
        await client.connect();
        const res = await client.query(`SELECT id, slug, tips, precautions, benefits FROM exercises`);
        let fixedCount = 0;
        let errorCount = 0;

        for (const row of res.rows) {
            let needsUpdate = false;
            let newTips = row.tips;
            let newPrecautions = row.precautions;
            let newBenefits = row.benefits;

            const checkAndFix = (val, fieldName) => {
                try {
                    if (typeof val === 'string') JSON.parse(val);
                    return val;
                } catch (e) {
                    const fixed = fixJsonArrayString(val);
                    if (fixed) {
                        needsUpdate = true;
                        return fixed;
                    } else {
                        console.log(`Failed to fix ${fieldName} for ${row.slug}`);
                        errorCount++;
                        return val;
                    }
                }
            };

            newTips = checkAndFix(row.tips, 'tips');
            newPrecautions = checkAndFix(row.precautions, 'precautions');
            newBenefits = checkAndFix(row.benefits, 'benefits');

            if (needsUpdate) {
                await client.query(
                    `UPDATE exercises SET tips = $1, precautions = $2, benefits = $3 WHERE id = $4`,
                    [newTips, newPrecautions, newBenefits, row.id]
                );
                fixedCount++;
            }
        }
        console.log(`Successfully fixed ${fixedCount} exercises.`);
        if (errorCount > 0) {
            console.log(`Failed to fix ${errorCount} fields.`);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
