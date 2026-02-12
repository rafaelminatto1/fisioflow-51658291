/**
 * Healthcare-Grade Audit Logger
 * 
 * Implements structured logging for sensitive clinical operations
 * following principles from the "Secure Data Storage for Healthcare" blueprint.
 */

import { adminDb } from '../init';
import { logger } from './logger';

export interface AuditEvent {
    action: 'read' | 'create' | 'update' | 'delete' | 'export' | 'ai_analysis';
    resourceType: 'patient' | 'evolution' | 'assessment' | 'image' | 'financial';
    resourceId: string;
    userId: string;
    organizationId: string;
    description: string;
    metadata?: Record<string, any>;
    sensitivity?: 'low' | 'medium' | 'high' | 'phi';
}

/**
 * Logs a structured audit event to Firestore
 * These logs should be stored in a collection with limited access (Admin only)
 */
export async function logAuditEvent(event: AuditEvent) {
    const timestamp = new Date().toISOString();
    
    const auditData = {
        ...event,
        timestamp,
        version: '1.0',
        environment: process.env.NODE_ENV || 'development',
    };

    try {
        // 1. Log to Firestore for application-level auditing
        await adminDb.collection('audit_logs').add(auditData);

        // 2. Log to Cloud Logging for infrastructure auditing
        // This is important for compliance as Cloud Logging has immutable options
        logger.info(`[AUDIT] ${event.action.toUpperCase()} on ${event.resourceType}`, {
            ...auditData,
            severity: event.sensitivity === 'phi' ? 'NOTICE' : 'INFO'
        });

    } catch (error) {
        // Fallback to console if everything fails, we MUST not lose audit trails
        console.error('[CRITICAL-AUDIT-FAILURE]', error, auditData);
    }
}

/**
 * Middleware for tracking PHI (Protected Health Information) access
 */
export async function logPHIAccess(userId: string, patientId: string, organizationId: string, reason: string) {
    return logAuditEvent({
        action: 'read',
        resourceType: 'patient',
        resourceId: patientId,
        userId,
        organizationId,
        description: `Acesso a PHI: ${reason}`,
        sensitivity: 'phi'
    });
}
