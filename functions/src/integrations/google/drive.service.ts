import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class DriveService {
  private drive: any;
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string) {
    this.oauth2Client = new OAuth2Client();
    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  async saveToDrive(
    pdfBuffer: Buffer,
    fileName: string,
    folderId?: string
  ) {
    const fileMetadata: any = { name: fileName };
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: 'application/pdf',
      body: pdfBuffer,
    };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,webViewLink',
    });
    return response.data;
  }

  async createFolder(name: string, parentId?: string) {
    const fileMetadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    return response.data;
  }

  async shareFile(fileId: string, email: string, role: 'reader' | 'writer' = 'reader') {
    const response = await this.drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role,
        type: 'user',
        emailAddress: email,
      },
      sendNotificationEmail: false,
    });
    return response.data;
  }

  async listTemplates(folderId?: string) {
    const q = folderId 
      ? `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document'`
      : "mimeType = 'application/vnd.google-apps.document' and name contains 'Template'";
    
    const response = await this.drive.files.list({
      q,
      fields: 'files(id, name, thumbnailLink)',
    });
    return response.data.files;
  }
}
