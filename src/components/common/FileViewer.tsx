import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Eye, Download, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getFirebaseStorage, ref, getDownloadURL } from '@/integrations/firebase/storage';

interface FileViewerProps {
    files: {
        id: string;
        file_path: string;
        file_name: string;
        file_type: string;
    }[];
    bucketName: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({ files, bucketName }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const getPublicUrl = async (path: string): Promise<string> => {
        const storage = getFirebaseStorage();
        const storageRef = ref(storage, `${bucketName}/${path}`);
        return await getDownloadURL(storageRef);
    };

    // Cache for URLs to avoid repeated fetches
    const urlCache = new Map<string, string>();

    const getCachedUrl = async (path: string): Promise<string> => {
        if (!urlCache.has(path)) {
            const url = await getPublicUrl(path);
            urlCache.set(path, url);
        }
        return urlCache.get(path)!;
    };

    const selectedFile = selectedIndex !== null ? files[selectedIndex] : null;
    const [urls, setUrls] = useState<Map<string, string>>(new Map());

    // Fetch all URLs on mount
    React.useEffect(() => {
        const fetchUrls = async () => {
            const newUrls = new Map<string, string>();
            await Promise.all(files.map(async (file) => {
                const url = await getCachedUrl(file.file_path);
                newUrls.set(file.file_path, url);
            }));
            setUrls(newUrls);
        };
        fetchUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files]);

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedIndex !== null && selectedIndex < files.length - 1) {
            setSelectedIndex(selectedIndex + 1);
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedIndex !== null && selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
        }
    };

    if (!files || files.length === 0) {
        return <div className="text-xs text-muted-foreground italic">Sem arquivos anexados</div>;
    }

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
                {files.slice(0, 4).map((file, idx) => {
                    const url = urls.get(file.file_path);
                    const isImage = file.file_type?.startsWith('image/') || file.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                    // Show +N overlay for the last item if there are more than 4
                    const isLastItem = idx === 3;
                    const remainingCount = files.length - 4;

                    return (
                        <div
                            key={file.id}
                            className="relative group/file rounded-md overflow-hidden border bg-muted aspect-square cursor-pointer"
                            onClick={() => setSelectedIndex(idx)}
                        >
                            {isImage && url ? (
                                <OptimizedImage src={url} alt={file.file_name} className="w-full h-full transition-transform group-hover/file:scale-105" aspectRatio="auto" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full p-2 text-center bg-gray-50">
                                    <FileText className="w-8 h-8 mb-1 text-muted-foreground" />
                                    <span className="text-[10px] truncate w-full px-1">{file.file_name}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/file:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-6 h-6 text-white" />
                            </div>
                            {isLastItem && remainingCount > 0 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg pointer-events-none">
                                    +{remainingCount + 1}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/95 text-white border-none close-button-white overflow-hidden flex flex-col">
                    <DialogTitle className="sr-only">Visualização de Arquivo</DialogTitle>
                    <div className="absolute top-4 right-4 z-50 flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 rounded-full"
                            onClick={() => {
                                if (selectedFile) {
                                    const url = urls.get(selectedFile.file_path);
                                    if (url) window.open(url, '_blank');
                                }
                            }}
                        >
                            <Download className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 rounded-full"
                            onClick={() => setSelectedIndex(null)}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

                    <div className="flex-1 flex items-center justify-center relative min-h-[50vh]">
                        {selectedFile && (
                            <>
                                {(selectedFile.file_type?.startsWith('image/') || selectedFile.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && urls.get(selectedFile.file_path) ? (
                                    <img
                                        src={urls.get(selectedFile.file_path)}
                                        alt={selectedFile.file_name}
                                        className="max-w-full max-h-[85vh] object-contain"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 text-center">
                                        <FileText className="w-24 h-24 mb-4 text-gray-500" />
                                        <h3 className="text-xl font-medium mb-2">{selectedFile.file_name}</h3>
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                const url = urls.get(selectedFile.file_path);
                                                if (url) window.open(url, '_blank');
                                            }}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Baixar Arquivo
                                        </Button>
                                    </div>
                                )}

                                {files.length > 1 && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full disabled:opacity-30"
                                            onClick={handlePrev}
                                            disabled={selectedIndex === 0}
                                        >
                                            <ChevronLeft className="w-8 h-8" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full disabled:opacity-30"
                                            onClick={handleNext}
                                            disabled={selectedIndex === files.length - 1}
                                        >
                                            <ChevronRight className="w-8 h-8" />
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    {selectedFile && (
                        <div className="bg-black/80 p-4 text-center">
                            <p className="text-sm font-medium">{selectedFile.file_name}</p>
                            <p className="text-xs text-gray-500">{selectedIndex! + 1} de {files.length}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};
