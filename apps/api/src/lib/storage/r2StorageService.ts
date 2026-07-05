import { R2Bucket } from "@cloudflare/workers-types";

export type FileCategory = "media" | "exams" | "clinical_docs" | "generated_reports" | "patient_uploads";

export interface UploadOptions {
  category: FileCategory;
  organizationId: string;
  patientId?: string;
  userId: string;
  fileName: string;
  contentType: string;
  fileBuffer: ArrayBuffer | ReadableStream;
  size: number;
}

export class R2StorageService {
  private mediaBucket: R2Bucket;
  private examsBucket: R2Bucket;
  private clinicalDocsBucket: R2Bucket;

  constructor(env: any) {
    // Inject bindings from Wrangler
    this.mediaBucket = env.MEDIA_BUCKET;
    this.examsBucket = env.EXAMS_BUCKET;
    this.clinicalDocsBucket = env.CLINICAL_DOCS_BUCKET;
  }

  /**
   * Resolução de Bucket com base na Categoria e Política de Sensibilidade
   */
  private getBucketForCategory(category: FileCategory): R2Bucket {
    switch (category) {
      case "exams":
        return this.examsBucket;
      case "clinical_docs":
      case "generated_reports":
      case "patient_uploads":
        return this.clinicalDocsBucket;
      case "media":
      default:
        return this.mediaBucket;
    }
  }

  /**
   * Validação rígida anti-malware e excesso de uso
   */
  private validateFile(fileName: string, size: number, contentType: string) {
    const BLOCKED_EXTENSIONS = [".exe", ".sh", ".bat", ".cmd", ".msi", ".vbs", ".js", ".ts"];
    const lowerName = fileName.toLowerCase();

    // 1. Bloqueio de executáveis
    if (BLOCKED_EXTENSIONS.some(ext => lowerName.endsWith(ext))) {
      throw new Error("SECURITY_ERROR: Formato de arquivo proibido.");
    }

    // 2. Limite de tamanho (ex: 50MB)
    const MAX_SIZE_MB = 50 * 1024 * 1024;
    if (size > MAX_SIZE_MB) {
      throw new Error("PAYLOAD_TOO_LARGE: O arquivo excede o limite de 50MB.");
    }

    // 3. Ponto de Extensão para Antivírus (ex: acionar um workflow de scan futuro)
    // TODO: if (requiresMalwareScan) enqueueToScanner(file);
  }

  /**
   * Faz o upload restrito e injeta metadados essenciais
   */
  public async upload(options: UploadOptions): Promise<string> {
    this.validateFile(options.fileName, options.size, options.contentType);

    const bucket = this.getBucketForCategory(options.category);
    
    // Pattern de path: organizationId/category/patientId/UUID-filename
    const uniqueId = crypto.randomUUID();
    const objectKey = `${options.organizationId}/${options.category}/${options.patientId || "global"}/${uniqueId}-${options.fileName}`;

    const metadata: Record<string, string> = {
      organizationId: options.organizationId,
      uploadedBy: options.userId,
      originalName: options.fileName,
      category: options.category
    };

    if (options.patientId) {
      metadata.patientId = options.patientId;
    }

    await bucket.put(objectKey, options.fileBuffer, {
      httpMetadata: { contentType: options.contentType },
      customMetadata: metadata
    });

    console.log(`[R2 UPLOAD] Key: ${objectKey} | Org: ${options.organizationId} | Size: ${options.size} bytes`);

    return objectKey;
  }

  /**
   * Download privado (Retorna a stream, o controller Hono deve devolver ao usuário autorizado)
   */
  public async getPrivateFile(objectKey: string, category: FileCategory) {
    const bucket = this.getBucketForCategory(category);
    const object = await bucket.get(objectKey);

    if (!object) {
      return null;
    }

    console.log(`[R2 DOWNLOAD] Key: ${objectKey}`);
    return object;
  }

  /**
   * Exclusão
   */
  public async deleteFile(objectKey: string, category: FileCategory): Promise<void> {
    const bucket = this.getBucketForCategory(category);
    await bucket.delete(objectKey);
    console.log(`[R2 DELETE] Key: ${objectKey}`);
  }
}
