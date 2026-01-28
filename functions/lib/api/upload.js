"use strict";
/**
 * Upload API - Firebase Cloud Function
 *
 * Substitui a rota /api/upload que usava Vercel Blob
 * Agora usa Firebase Storage para todos os uploads
 *
 * @version 1.1.0 - Firebase Functions v2 - Refactored for consistency
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUserFiles = exports.deleteFile = exports.confirmUpload = exports.generateUploadToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const init_1 = require("../init");
// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================
/**
 * Generate a signed URL for direct upload to Firebase Storage
 */
exports.generateUploadToken = (0, https_1.onCall)(async (request) => {
    const { data, auth } = request;
    // Auth check
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { filename, contentType, folder = 'uploads' } = data;
    // Validate input
    if (!filename || !contentType) {
        throw new https_1.HttpsError('invalid-argument', 'filename and contentType are required');
    }
    // Validate content type
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'application/pdf', 'text/plain', 'application/json',
    ];
    if (!allowedTypes.includes(contentType)) {
        throw new https_1.HttpsError('failed-precondition', `Content type ${contentType} not allowed`);
    }
    try {
        // Get user info (for verification)
        const adminAuth = (0, init_1.getAdminAuth)();
        await adminAuth.getUser(auth.uid); // Verify user exists
        // Generate unique storage path
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const extension = filename.split('.').pop();
        const storageFilename = `${timestamp}-${random}.${extension}`;
        const storagePath = `${folder}/${auth.uid}/${storageFilename}`;
        // Get admin storage instance
        const adminStorage = (0, init_1.getAdminStorage)();
        const bucket = adminStorage.bucket();
        const file = bucket.file(storagePath);
        // Generate signed URL for upload (valid for 15 minutes)
        const [uploadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType,
        });
        firebase_functions_1.logger.info('[generateUploadToken] Upload token generated', {
            userId: auth.uid,
            storagePath,
            contentType,
        });
        return {
            uploadUrl,
            storagePath,
            token: Buffer.from(JSON.stringify({ storagePath, contentType })).toString('base64'), // Simple token for client verification
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('[generateUploadToken] Error', {
            userId: auth.uid,
            error,
        });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to generate upload token');
    }
});
/**
 * Confirm an upload and get the download URL
 */
exports.confirmUpload = (0, https_1.onCall)(async (request) => {
    const { data, auth } = request;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { storagePath, token } = data;
    if (!storagePath) {
        throw new https_1.HttpsError('invalid-argument', 'storagePath is required');
    }
    try {
        // Verify token (basic check)
        let tokenData;
        try {
            tokenData = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        }
        catch {
            throw new https_1.HttpsError('permission-denied', 'Invalid token');
        }
        if (tokenData.storagePath !== storagePath) {
            throw new https_1.HttpsError('permission-denied', 'Token mismatch');
        }
        // Get the file from storage
        const adminStorage = (0, init_1.getAdminStorage)();
        const bucket = adminStorage.bucket();
        const file = bucket.file(storagePath);
        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            throw new https_1.HttpsError('not-found', 'File not found');
        }
        // Get signed URL for download (valid for 1 year)
        const [downloadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
        });
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
        firebase_functions_1.logger.info('[confirmUpload] Upload confirmed', {
            userId: auth.uid,
            storagePath,
        });
        return {
            downloadUrl,
            publicUrl,
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        firebase_functions_1.logger.error('[confirmUpload] Error', {
            userId: auth.uid,
            storagePath,
            error,
        });
        throw new https_1.HttpsError('internal', 'Failed to confirm upload');
    }
});
/**
 * Delete a file from Firebase Storage
 */
exports.deleteFile = (0, https_1.onCall)(async (request) => {
    const { data, auth } = request;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { storagePath } = data;
    if (!storagePath) {
        throw new https_1.HttpsError('invalid-argument', 'storagePath is required');
    }
    try {
        // Verify user owns the file (path should contain user ID)
        if (!storagePath.includes(`/${auth.uid}/`) && !storagePath.startsWith(`${auth.uid}/`)) {
            throw new https_1.HttpsError('permission-denied', 'You can only delete your own files');
        }
        const adminStorage = (0, init_1.getAdminStorage)();
        const bucket = adminStorage.bucket();
        const file = bucket.file(storagePath);
        await file.delete();
        firebase_functions_1.logger.info('[deleteFile] File deleted', {
            userId: auth.uid,
            storagePath,
        });
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error('[deleteFile] Error', {
            userId: auth.uid,
            storagePath,
            error,
        });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to delete file');
    }
});
/**
 * List files owned by the user
 */
exports.listUserFiles = (0, https_1.onCall)(async (request) => {
    const { data, auth } = request;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { folder = 'uploads' } = data;
    try {
        const adminStorage = (0, init_1.getAdminStorage)();
        const bucket = adminStorage.bucket();
        const prefix = `${folder}/${auth.uid}/`;
        const [files] = await bucket.getFiles({ prefix });
        const fileList = files.map((file) => ({
            name: file.name.split('/').pop() || file.name,
            path: file.name,
            size: typeof file.metadata.size === 'number'
                ? file.metadata.size
                : parseInt(String(file.metadata.size || '0'), 10),
            contentType: file.metadata.contentType || 'unknown',
            updatedAt: file.metadata.updated || new Date().toISOString(),
        }));
        firebase_functions_1.logger.info('[listUserFiles] Files listed', {
            userId: auth.uid,
            count: fileList.length,
        });
        return { files: fileList };
    }
    catch (error) {
        firebase_functions_1.logger.error('[listUserFiles] Error', {
            userId: auth.uid,
            error,
        });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to list files');
    }
});
//# sourceMappingURL=upload.js.map