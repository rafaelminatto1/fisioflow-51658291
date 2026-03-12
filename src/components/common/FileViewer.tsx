import React, { useCallback, useRef, useState } from 'react';
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from '@/components/ui/custom-modal';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Eye, Download, FileText, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { resolvePublicStorageUrl } from '@/lib/storage/public-url';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
    const isMobile = useIsMobile();
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const getPublicUrl = useCallback(async (path: string): Promise<string> => {
        return resolvePublicStorageUrl(path, bucketName);
    }, [bucketName]);

    // Cache for URLs to avoid repeated fetches
    const urlCache = useRef(new Map<string, string>());

    const getCachedUrl = useCallback(async (path: string): Promise<string> => {
        if (!urlCache.current.has(path)) {
            const url = await getPublicUrl(path);
            urlCache.current.set(path, url);
        }
        return urlCache.current.get(path)!;
    }, [getPublicUrl]);

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
    }, [files, getCachedUrl]);

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIndex !== null && selectedIndex < files.length - 1) {
            setSelectedIndex(selectedIndex + 1);
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (selectedIndex !== null && selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
        }
    };

    if (!files || files.length === 0) {
        return <div className="text-xs text-muted-foreground italic">Sem arquivos anexados</div>;
    }

    const isImage = (file: typeof files[0]) => 
        file.file_type?.startsWith('image/') || file.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
                {files.slice(0, 4).map((file, idx) => {
                    const url = urls.get(file.file_path);
                    const isImg = isImage(file);

                    // Show +N overlay for the last item if there are more than 4
                    const isLastItem = idx === 3;
                    const remainingCount = files.length - 4;

                    return (
                        <div
                            key={file.id}
                            className="relative group/file rounded-xl overflow-hidden border border-slate-200 bg-muted aspect-square cursor-pointer transition-all hover:border-primary/50"
                            onClick={() => setSelectedIndex(idx)}
                        >
                            {isImg && url ? (
                                <OptimizedImage src={url} alt={file.file_name} className="w-full h-full transition-transform duration-500 group-hover/file:scale-110" aspectRatio="auto" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full p-2 text-center bg-slate-50">
                                    <FileText className="w-8 h-8 mb-1 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-500 truncate w-full px-1 uppercase">{file.file_name.split('.').pop()}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/file:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-6 h-6 text-white drop-shadow-md" />
                            </div>
                            {isLastItem && remainingCount > 0 && (
                                <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center text-white pointer-events-none">
                                    <span className="font-black text-xl">+{remainingCount + 1}</span>
                                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">Arquivos</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <CustomModal 
                open={selectedIndex !== null} 
                onOpenChange={(open) => !open && setSelectedIndex(null)}
                isMobile={isMobile}
                contentClassName="max-w-5xl h-[95vh] bg-slate-950 border-slate-800"
            >
                <CustomModalHeader className="border-slate-800 bg-slate-900/50" onClose={() => setSelectedIndex(null)}>
                    <div className="flex flex-col gap-0.5">
                        <CustomModalTitle className="text-white text-lg font-bold flex items-center gap-2">
                            {selectedFile && isImage(selectedFile) ? <ImageIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                            Visualização de Arquivo
                        </CustomModalTitle>
                        {selectedFile && (
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest truncate max-w-[300px]">
                                {selectedFile.file_name}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-auto mr-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full"
                            onClick={() => {
                                if (selectedFile) {
                                    const url = urls.get(selectedFile.file_path);
                                    if (url) window.open(url, '_blank');
                                }
                            }}
                        >
                            <Download className="w-5 h-5" />
                        </Button>
                    </div>
                </CustomModalHeader>

                <CustomModalBody className="p-0 sm:p-0 bg-slate-950 flex flex-col">
                    <div className="flex-1 flex items-center justify-center relative group">
                        {selectedFile && (
                            <>
                                {isImage(selectedFile) && urls.get(selectedFile.file_path) ? (
                                    <img
                                        src={urls.get(selectedFile.file_path)}
                                        alt={selectedFile.file_name}
                                        className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-300"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
                                        <div className="w-32 h-32 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
                                            <FileText className="w-16 h-16 text-slate-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">{selectedFile.file_name}</h3>
                                            <p className="text-slate-500 text-sm">Este tipo de arquivo não possui pré-visualização direta.</p>
                                        </div>
                                        <Button
                                            className="rounded-xl h-12 px-8 bg-white text-slate-950 hover:bg-slate-200 font-bold uppercase tracking-wider transition-all active:scale-95"
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
                                            className={cn(
                                                "absolute left-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-black/20 text-white backdrop-blur-sm transition-all hover:bg-black/40 border border-white/10",
                                                selectedIndex === 0 && "opacity-0 pointer-events-none"
                                            )}
                                            onClick={handlePrev}
                                            disabled={selectedIndex === 0}
                                        >
                                            <ChevronLeft className="w-10 h-10" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "absolute right-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-black/20 text-white backdrop-blur-sm transition-all hover:bg-black/40 border border-white/10",
                                                selectedIndex === files.length - 1 && "opacity-0 pointer-events-none"
                                            )}
                                            onClick={handleNext}
                                            disabled={selectedIndex === files.length - 1}
                                        >
                                            <ChevronRight className="w-10 h-10" />
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </CustomModalBody>

                <CustomModalFooter isMobile={isMobile} className="bg-slate-900 border-slate-800 py-3">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex gap-1.5 overflow-x-auto max-w-[60%] scrollbar-hide py-1">
                            {files.map((_, i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "h-1.5 min-w-[12px] rounded-full transition-all",
                                        i === selectedIndex ? "bg-primary w-6" : "bg-slate-700"
                                    )}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {selectedIndex! + 1} / {files.length}
                            </span>
                            <Button variant="ghost" onClick={() => setSelectedIndex(null)} className="rounded-xl h-9 px-4 font-bold text-slate-400 hover:text-white hover:bg-white/5 uppercase text-xs">
                                Fechar
                            </Button>
                        </div>
                    </div>
                </CustomModalFooter>
            </CustomModal>
        </>
    );
};
