import { useState } from "react";

export interface UploadedFile {
  id: string;
  path?: string;
  name?: string;
  url?: string;
}

export interface UseFileUploadOptions {
  onUploadSuccess?: (files: UploadedFile[]) => void;
  onUploadError?: (error: unknown) => void;
  maxSize?: number;
  acceptedFileTypes?: string[];
  [key: string]: unknown;
}

export function useFileUpload(_options?: UseFileUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const upload = async (_files: File[]) => {
    setIsUploading(true);
    setProgress(0);
    // mock implementation
    setTimeout(() => {
      setIsUploading(false);
      setProgress(100);
    }, 1000);
  };

  const removeFile = (id: string, _path: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return {
    isUploading,
    progress,
    uploadedFiles,
    upload,
    removeFile,
  };
}
