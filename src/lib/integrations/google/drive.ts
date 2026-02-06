/**
 * Google Drive API Integration
 * Gerencia arquivos, pastas e permissões no Google Drive
 */

import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// ============================================================================
// Types
// ============================================================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
  size?: string;
}

export interface DriveFolder extends DriveFile {
  mimeType: 'application/vnd.google-apps.folder';
}

export interface DrivePermission {
  id: string;
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'reader';
  type: 'user' | 'group' | 'domain' | 'anyone';
  emailAddress?: string;
  domain?: string;
  allowDiscovery?: boolean;
}

export interface UploadResult {
  id: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
}

// ============================================================================
// Drive Service Class
// ============================================================================

export class DriveService {
  private drive: drive_v3.Drive;
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string) {
    this.oauth2Client = new OAuth2Client();
    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  // ========================================================================
  // File Operations
  // ========================================================================

  /**
   * Lista arquivos no Drive
   */
  async listFiles(options: {
    pageSize?: number;
    folderId?: string;
    mimeType?: string;
    query?: string;
  } = {}): Promise<DriveFile[]> {
    const { pageSize = 100, folderId, mimeType, query } = options;

    let q = "trashed = false";
    if (folderId) {
      q += ` and '${folderId}' in parents`;
    }
    if (mimeType) {
      q += ` and mimeType = '${mimeType}'`;
    }
    if (query) {
      q += ` and (${query})`;
    }

    const response = await this.drive.files.list({
      pageSize,
      q,
      fields: 'files(id,name,mimeType,webViewLink,webContentLink,parents,createdTime,modifiedTime,size)',
    });

    return response.data.files || [];
  }

  /**
   * Busca arquivo por ID
   */
  async getFile(fileId: string): Promise<DriveFile> {
    const response = await this.drive.files.get({
      fileId,
      fields: 'id,name,mimeType,webViewLink,webContentLink,parents,createdTime,modifiedTime,size',
    });

    return response.data;
  }

  /**
   * Cria uma nova pasta
   */
  async createFolder(
    name: string,
    parentId?: string
  ): Promise<DriveFolder> {
    const fileMetadata: drive_v3.Schema$File = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id,name,mimeType,webViewLink,parents,createdTime,modifiedTime',
    });

    return response.data;
  }

  /**
   * Cria estrutura de pastas para um paciente
   */
  async createPatientFolderStructure(
    tenantId: string,
    patientId: string,
    patientName: string
  ): Promise<{
    rootFolder: DriveFolder;
    examsFolder: DriveFolder;
    reportsFolder: DriveFolder;
    documentsFolder: DriveFolder;
  }> {
    // Criar pasta raiz do paciente (ou usar pasta existente)
    const sanitizedPatientName = patientName.replace(/[^a-zA-Z0-9]/g, '_');
    const rootFolderName = `Paciente_${sanitizedPatientName}_${patientId.slice(-6)}`;

    // Verificar se pasta raiz já existe
    const existing = await this.listFiles({
      query: `name = '${rootFolderName}' and mimeType = 'application/vnd.google-apps.folder'`,
    });

    let rootFolder: DriveFolder;

    if (existing.length > 0) {
      rootFolder = existing[0] as DriveFolder;
    } else {
      rootFolder = await this.createFolder(rootFolderName);
    }

    // Criar subpastas
    const [examsFolder, reportsFolder, documentsFolder] = await Promise.all([
      this.createFolder('Exames', rootFolder.id),
      this.createFolder('Relatorios', rootFolder.id),
      this.createFolder('Documentos', rootFolder.id),
    ]);

    return { rootFolder, examsFolder, reportsFolder, documentsFolder };
  }

  /**
   * Upload de arquivo
   */
  async uploadFile(
    fileName: string,
    mimeType: string,
    fileBuffer: Buffer,
    folderId?: string
  ): Promise<UploadResult> {
    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      mimeType,
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType,
      body: fileBuffer,
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,name,webViewLink,webContentLink',
    });

    return response.data;
  }

  /**
   * Upload de PDF
   */
  async uploadPdf(
    fileName: string,
    pdfBuffer: Buffer,
    folderId?: string
  ): Promise<UploadResult> {
    return this.uploadFile(fileName, 'application/pdf', pdfBuffer, folderId);
  }

  /**
   * Copia arquivo
   */
  async copyFile(fileId: string, name: string, parentId?: string): Promise<DriveFile> {
    const fileMetadata: drive_v3.Schema$File = { name };

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const response = await this.drive.files.copy({
      fileId,
      requestBody: fileMetadata,
      fields: 'id,name,mimeType,webViewLink,webContentLink,parents,createdTime,modifiedTime',
    });

    return response.data;
  }

  /**
   * Move arquivo para uma pasta
   */
  async moveFile(fileId: string, folderId: string): Promise<void> {
    // Buscar pais atuais
    const file = await this.drive.files.get({
      fileId,
      fields: 'parents',
    });
    const previousParents = (file.data.parents || []).join(',');

    // Mover arquivo
    await this.drive.files.update({
      fileId,
      addParents: folderId,
      removeParents: previousParents,
      fields: 'id, parents',
    });
  }

  /**
   * Deleta arquivo (move para lixeira)
   */
  async trashFile(fileId: string): Promise<void> {
    await this.drive.files.update({
      fileId,
      requestBody: { trashed: true },
    });
  }

  /**
   * Deleta arquivo permanentemente
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.drive.files.delete({ fileId });
  }

  // ========================================================================
  // Permission Operations
  // ========================================================================

  /**
   * Compartilha arquivo com usuário
   */
  async shareFile(
    fileId: string,
    email: string,
    role: 'reader' | 'writer' | 'commenter' = 'reader',
    notifyEmail: boolean = false,
    emailMessage?: string
  ): Promise<DrivePermission> {
    const response = await this.drive.permissions.create({
      fileId,
      requestBody: {
        role,
        type: 'user',
        emailAddress: email,
      },
      sendNotificationEmail: notifyEmail,
      emailMessage: emailMessage || undefined,
      fields: 'id,role,type,emailAddress',
    });

    return response.data;
  }

  /**
   * Compartilha pasta com usuário
   */
  async shareFolder(
    folderId: string,
    email: string,
    role: 'reader' | 'writer' = 'writer'
  ): Promise<DrivePermission> {
    return this.shareFile(folderId, email, role, true);
  }

  /**
   * Remove permissão
   */
  async removePermission(fileId: string, permissionId: string): Promise<void> {
    await this.drive.permissions.delete({
      fileId,
      permissionId,
    });
  }

  /**
   * Lista permissões de um arquivo
   */
  async listPermissions(fileId: string): Promise<DrivePermission[]> {
    const response = await this.drive.permissions.list({
      fileId,
      fields: 'permissions(id,role,type,emailAddress,domain,allowDiscovery)',
    });

    return response.data.permissions || [];
  }

  /**
   * Gera link de compartilhamento público
   */
  async getShareableLink(fileId: string): Promise<string> {
    // Primeiro, tornar o arquivo publicamente acessível
    await this.drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Buscar o webViewLink
    const file = await this.getFile(fileId);
    return file.webViewLink || '';
  }

  // ========================================================================
  // Export Operations
  // ========================================================================

  /**
   * Exporta arquivo Google Docs para PDF
   */
  async exportToPdf(fileId: string): Promise<Buffer> {
    const response = await this.drive.files.export({
      fileId,
      mimeType: 'application/pdf',
    });

    return response.data;
  }

  /**
   * Exporta arquivo para outros formatos
   */
  async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
    const response = await this.drive.files.export({
      fileId,
      mimeType,
    });

    return response.data;
  }

  // ========================================================================
  // Search Operations
  // ========================================================================

  /**
   * Busca arquivos por nome
   */
  async searchByName(name: string, folderId?: string): Promise<DriveFile[]> {
    return this.listFiles({
      folderId,
      query: `name contains '${name}'`,
    });
  }

  /**
   * Busca arquivos por tipo MIME
   */
  async searchByMimeType(mimeType: string, folderId?: string): Promise<DriveFile[]> {
    return this.listFiles({
      folderId,
      mimeType,
    });
  }

  /**
   * Busca PDFs
   */
  async getPdfs(folderId?: string): Promise<DriveFile[]> {
    return this.searchByMimeType('application/pdf', folderId);
  }

  /**
   * Busca Google Docs
   */
  async getGoogleDocs(folderId?: string): Promise<DriveFile[]> {
    return this.searchByMimeType('application/vnd.google-apps.document', folderId);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Cria instância do Drive Service
 */
export async function createDriveService(accessToken: string): Promise<DriveService> {
  return new DriveService(accessToken);
}

/**
 * Verifica se arquivo é pasta
 */
export function isFolder(file: DriveFile): file is DriveFolder {
  return file.mimeType === 'application/vnd.google-apps.folder';
}

/**
 * Verifica se arquivo é Google Doc
 */
export function isGoogleDoc(file: DriveFile): boolean {
  return file.mimeType === 'application/vnd.google-apps.document';
}

/**
 * Verifica se arquivo é PDF
 */
export function isPdf(file: DriveFile): boolean {
  return file.mimeType === 'application/pdf';
}
