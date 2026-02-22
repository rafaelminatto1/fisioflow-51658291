import { useState } from 'react';

export interface UseFileUploadOptions {
    onUploadSuccess?: (files: any[]) => void;
    onUploadError?: (error: any) => void;
    maxSize?: number;
    acceptedFileTypes?: string[];
    [key: string]: any;
}

export function useFileUpload(options?: UseFileUploadOptions) {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

    const upload = async (files: File[]) => {
        setIsUploading(true);
        setProgress(0);
        // mock implementation
        setTimeout(() => {
            setIsUploading(false);
            setProgress(100);
        }, 1000);
    };

    const removeFile = (id: string, path: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
    };

    return {
        isUploading,
        progress,
        uploadedFiles,
        upload,
        removeFile
    };
}