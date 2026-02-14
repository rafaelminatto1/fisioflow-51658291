import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class DocsService {
  private docs: any;
  private drive: any;
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string) {
    this.oauth2Client = new OAuth2Client();
    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  async copyTemplate(templateId: string, name: string) {
    const response = await this.drive.files.copy({
      fileId: templateId,
      requestBody: { name },
    });
    return response.data;
  }

  async replacePlaceholders(documentId: string, placeholders: Record<string, string>) {
    const requests = Object.entries(placeholders).map(([key, value]) => ({
      replaceAllText: {
        containsText: { text: `{{${key}}}` },
        replaceText: value || '',
      },
    }));

    if (requests.length === 0) return null;

    const response = await this.docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
    return response.data;
  }

  async exportToPdf(documentId: string) {
    const response = await this.drive.files.export({
      fileId: documentId,
      mimeType: 'application/pdf',
    }, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
}
