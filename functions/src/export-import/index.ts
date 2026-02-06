/**
 * Export/Import Functions
 * Functions for exporting and importing patient data
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getLogger } from '../lib/logger';
import { getPool } from '../init';

// @ts-expect-error - csv-writer may not have types
import * as csv from 'csv-writer';
// @ts-expect-error - csv-parser may not have types
import * as parser from 'csv-parser';

const logger = getLogger('export-import');
const db = admin.firestore();
const storage = admin.storage();

/**
 * Export patients to JSON/CSV
 */
export const exportPatientsHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { organizationId, format = 'json', filters = {} } = data as {
    organizationId: string;
    format?: 'json' | 'csv';
    filters?: {
      startDate?: string;
      endDate?: string;
      status?: 'active' | 'inactive' | 'all';
      includeDeleted?: boolean;
    };
  };

  if (!organizationId) {
    throw new HttpsError('invalid-argument', 'organizationId is required');
  }

  try {
    logger.info('Starting patient export', { userId, organizationId, format, filters });

    // Build query
    let query = db
      .collection('patients')
      .where('organizationId', '==', organizationId) as any;

    if (filters.status && filters.status !== 'all') {
      query = query.where('status', '==', filters.status);
    }

    if (filters.startDate) {
      query = query.where('createdAt', '>=', new Date(filters.startDate));
    }

    if (filters.endDate) {
      query = query.where('createdAt', '<=', new Date(filters.endDate));
    }

    const snapshot = await query.limit(1000).get();

    if (snapshot.empty) {
      return {
        success: true,
        count: 0,
        url: null,
        message: 'No patients found matching the criteria',
      };
    }

    const patients = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Generate file based on format
    const filename = `patients_export_${Date.now()}.${format}`;
    const bucket = storage.bucket();
    const file = bucket.file(`exports/${userId}/${filename}`);

    if (format === 'csv') {
      // Convert to CSV
      const csvData = convertPatientsToCSV(patients);
      await file.save(csvData, {
        contentType: 'text/csv',
        metadata: {
          exportedBy: userId,
          organizationId,
          exportDate: new Date().toISOString(),
          count: patients.length,
        },
      });
    } else {
      // JSON format
      const jsonData = JSON.stringify(
        {
          exportDate: new Date().toISOString(),
          organizationId,
          count: patients.length,
          patients,
        },
        null,
        2
      );
      await file.save(jsonData, {
        contentType: 'application/json',
        metadata: {
          exportedBy: userId,
          organizationId,
          exportDate: new Date().toISOString(),
          count: patients.length,
        },
      });
    }

    // Generate signed URL (valid for 15 minutes)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });

    logger.info('Patient export completed', {
      userId,
      organizationId,
      count: patients.length,
      format,
      filename,
    });

    return {
      success: true,
      count: patients.length,
      url,
      filename,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    logger.error('Patient export failed', { error, userId, organizationId });
    throw new HttpsError(
      'internal',
      `Failed to export patients: ${(error as Error).message}`
    );
  }
};

export const exportPatients = onCall(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 5,
    timeoutSeconds: 300,
  },
  exportPatientsHandler
);

/**
 * Import patients from JSON/CSV
 */
export const importPatientsHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { organizationId, format = 'json', patientData, options = {} } = data as {
    organizationId: string;
    format?: 'json' | 'csv';
    patientData: any[] | string;
    options?: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      preserveIds?: boolean;
    };
  };

  if (!organizationId || !patientData) {
    throw new HttpsError('invalid-argument', 'organizationId and patientData are required');
  }

  try {
    logger.info('Starting patient import', {
      userId,
      organizationId,
      format,
      options,
    });

    let patients: any[] = [];

    // Parse data based on format
    if (format === 'csv') {
      patients = parsePatientsFromCSV(patientData as string);
    } else {
      patients = patientData as any[];
    }

    if (patients.length === 0) {
      return {
        success: true,
        imported: 0,
        skipped: 0,
        failed: 0,
        errors: [],
        message: 'No patients to import',
      };
    }

    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ index: number; id?: string; error: string }>,
    };

    let batch = db.batch();
    const BATCH_SIZE = 500;
    let operations = 0;

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];

      try {
        // Validate patient data
        const validationResult = validatePatientData(patient);
        if (!validationResult.valid) {
          results.failed++;
          results.errors.push({
            index: i,
            id: patient.id || 'unknown',
            error: validationResult.error ?? 'Validation failed',
          });
          continue;
        }

        // Check for duplicates if skipDuplicates is enabled
        if (options.skipDuplicates) {
          const existingQuery = patient.email
            ? await db
              .collection('patients')
              .where('organizationId', '==', organizationId)
              .where('email', '==', patient.email)
              .limit(1)
              .get()
            : await db
              .collection('patients')
              .where('organizationId', '==', organizationId)
              .where('phone', '==', patient.phone)
              .limit(1)
              .get();

          if (!existingQuery.empty) {
            results.skipped++;
            continue;
          }
        }

        // Prepare patient document
        const patientDoc: any = {
          ...patient,
          organizationId,
          importedAt: admin.firestore.FieldValue.serverTimestamp(),
          importedBy: userId,
        };

        // Remove ID if not preserving
        let docRef: admin.firestore.DocumentReference;
        if (options.preserveIds && patient.id) {
          docRef = db.collection('patients').doc(patient.id);
          delete patientDoc.id;
        } else {
          docRef = db.collection('patients').doc();
          patientDoc.id = docRef.id;
        }

        // Update existing if enabled
        if (options.updateExisting) {
          const existingDoc = await docRef.get();
          if (existingDoc.exists) {
            batch.update(docRef, {
              ...patientDoc,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            batch.set(docRef, {
              ...patientDoc,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        } else {
          batch.set(docRef, {
            ...patientDoc,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        operations++;
        results.imported++;

        // Commit batch when full
        if (operations >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          operations = 0;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i,
          id: patient.id,
          error: (error as Error).message,
        });
      }
    }

    // Commit remaining operations
    if (operations > 0) {
      await batch.commit();
    }

    logger.info('Patient import completed', {
      userId,
      organizationId,
      results,
    });

    return {
      success: true,
      ...results,
      message: `Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed`,
    };
  } catch (error) {
    logger.error('Patient import failed', { error, userId, organizationId });
    throw new HttpsError(
      'internal',
      `Failed to import patients: ${(error as Error).message}`
    );
  }
};

export const importPatients = onCall(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 5,
    timeoutSeconds: 300,
  },
  importPatientsHandler
);

/**
 * Download export file
 */
export const downloadExportHandler = async (req: any, res: any) => {
  // CORS handling
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Extract and validate authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  const { filename } = req.query;
  if (!filename || typeof filename !== 'string') {
    res.status(400).json({ error: 'Filename is required' });
    return;
  }

  // CRITICAL: Validate filename format to prevent path traversal attacks
  // Only allow: UUID (for organization_id) + underscore + UUID (for request_id) + extension
  const filenamePattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(json|csv|md)$/;
  if (!filenamePattern.test(filename)) {
    logger.warn('Invalid filename format rejected', { filename });
    res.status(400).json({ error: 'Invalid filename format' });
    return;
  }

  // Prevent directory traversal by checking for path separators
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    logger.warn('Path traversal attempt blocked', { filename });
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  try {
    // Verify the user's identity and organization
    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Extract organization_id from filename (first UUID before underscore)
    const orgIdMatch = filename.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})_/);
    if (!orgIdMatch) {
      res.status(400).json({ error: 'Invalid filename format' });
      return;
    }
    const fileOrgId = orgIdMatch[1];

    // Verify user belongs to the organization from the filename
    const pool = getPool();
    const profileCheck = await pool.query(
      'SELECT organization_id, role FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (profileCheck.rows.length === 0) {
      res.status(403).json({ error: 'User not found' });
      return;
    }

    const userOrgId = profileCheck.rows[0].organization_id;

    // User can only download exports from their own organization
    if (userOrgId !== fileOrgId) {
      logger.warn('Unauthorized export download attempt', {
        userId,
        userOrgId,
        fileOrgId,
        filename
      });
      res.status(403).json({ error: 'Unauthorized access to export file' });
      return;
    }

    const bucket = storage.bucket();
    const file = bucket.file(`exports/${filename}`);

    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Get metadata to check file age (exports expire after 1 hour for security)
    const [metadata] = await file.getMetadata();
    const fileAge = Date.now() - (parseInt(metadata.timeCreated as string) || 0);
    const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds

    if (fileAge > maxAge) {
      logger.warn('Expired export file access attempt', { filename, fileAge });
      res.status(403).json({ error: 'Export file has expired. Please generate a new export.' });
      return;
    }

    // Stream file to response
    const readStream = file.createReadStream();
    res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Handle stream errors
    readStream.on('error', (streamError) => {
      logger.error('File stream error', { error: streamError, filename });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    });

    readStream.pipe(res);
  } catch (error) {
    if ((error as { code?: string })?.code === 'auth/argument-error') {
      res.status(401).json({ error: 'Invalid authorization token' });
      return;
    }
    logger.error('Download export failed', { error, filename });
    res.status(500).json({ error: 'Failed to download file' });
  }
};

export const downloadExport = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 10,
  },
  downloadExportHandler
);

// Helper functions

function convertPatientsToCSV(patients: any[]): string {
  if (patients.length === 0) return '';

  // Get all unique keys from all patients
  const keys = Array.from(
    new Set(patients.flatMap(p => Object.keys(p)))
  );

  // CSV header
  const header = keys.join(',');

  // CSV rows
  const rows = patients.map(patient => {
    return keys
      .map(key => {
        const value = patient[key];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Handle objects/arrays
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

function parsePatientsFromCSV(csvData: string): any[] {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const patients: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const patient: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (value) {
        // Try to parse as JSON for nested objects
        try {
          if (value.startsWith('{') || value.startsWith('[')) {
            patient[header] = JSON.parse(value.replace(/""/g, '"'));
          } else {
            patient[header] = value.replace(/^"|"$/g, '').replace(/""/g, '"');
          }
        } catch {
          patient[header] = value.replace(/^"|"$/g, '').replace(/""/g, '"');
        }
      }
    });

    patients.push(patient);
  }

  return patients;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function validatePatientData(patient: any): { valid: boolean; error?: string } {
  if (!patient.name) {
    return { valid: false, error: 'Name is required' };
  }

  // Validate email format if provided
  if (patient.email && !isValidEmail(patient.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Validate phone format if provided
  if (patient.phone && !isValidPhone(patient.phone)) {
    return { valid: false, error: 'Invalid phone format' };
  }

  return { valid: true };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  // Remove non-numeric characters
  const numbersOnly = phone.replace(/\D/g, '');
  // Brazilian phone: 10 or 11 digits
  return numbersOnly.length >= 10 && numbersOnly.length <= 11;
}
