/**
 * FisioFlow Database Schema
 * 
 * Export all tables and relations for Drizzle ORM
 */

// Patients & Medical Records (RF01.2)
export * from './patients';

// Appointments & Calendar (RF02)
export * from './appointments';

// Sessions & SOAP (RF01.3, RF01.4)
export * from './sessions';
