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

// Clinical Resources & Patient Details
export * from "./clinical";
export * from "./clinical_intelligence";

// Exercise Templates & Item Packages
export * from "./templates";

// Corporate Announcements & Policies
export * from "./announcements";

// Jules AI - PR Reviews & Learnings
export * from "./jules";

// Biomechanics & Gait Analysis (RF01.6)
export * from "./biomechanics";

// WhatsApp Shared Inbox
export * from "./whatsapp-inbox";

// Pre-cadastro (Digital Admission)
export * from "./precadastro";

// AI Studio Features
export * from "./ai_studio";

// Media & Gallery
export * from "./media";

// Agenda Appearance — per-user/org appearance profile (cloud sync)
export * from "./userAgendaAppearance";
