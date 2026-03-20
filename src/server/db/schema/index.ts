/**
 * FisioFlow Database Schema
 *
 * Export all tables and relations for Drizzle ORM
 * Database: Neon PostgreSQL (AWS São Paulo / sa-east-1)
 */

// Patients & Medical Records (RF01.2)
export * from "./patients";

// Core / Legacy
export * from "./organizations";

// Appointments & Calendar (RF02)
export * from "./appointments";

// Sessions & SOAP (RF01.3, RF01.4)
export * from "./sessions";

// Exercises, Categories & Favorites
export * from "./exercises";

// Treatment Protocols
export * from "./protocols";

// Wiki / Knowledge Base
export * from "./wiki";

// Gamification & Engagement
export * from "./gamification";

// Evaluation Templates
export * from "./evaluation_templates";

// Premium Task Management & Accountability
export * from "./tasks";

// Financial & Billing
export * from "./financial";
