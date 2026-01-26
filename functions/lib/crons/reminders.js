"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyReminders = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const pg_1 = require("pg");
exports.dailyReminders = (0, scheduler_1.onSchedule)('every day 08:00', async (event) => {
    const pool = new pg_1.Pool({
        connectionString: process.env.CLOUD_SQL_CONNECTION_STRING,
    });
    try {
        // Buscar agendamentos de hoje
        const result = await pool.query(`
      SELECT a.*, p.name, p.phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.date = CURRENT_DATE AND a.status = 'agendado'
    `);
        console.log(`Enviando ${result.rows.length} lembretes...`);
        // Lógica de envio (WhatsApp/Email) aqui
    }
    finally {
        await pool.end();
    }
});
//# sourceMappingURL=reminders.js.map