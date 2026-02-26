import React, { useRef, useState } from 'react';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Highlighter,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Undo2,
    Redo2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Plus,
    Image,
    Youtube,
    Link,
    Table as TableIcon,
    Code,
    Quote,
    Info,
    ChevronDown,
    Palette,
    Minus,
    Type,
    Rows,
    Columns,
    Trash2,
    Eraser,
    ClipboardCopy,
    AlertTriangle,
    CheckCircle2,
    Command as CommandIcon,
    Dumbbell,
} from 'lucide-react';
import { useRichTextContext } from '@/context/RichTextContext';
import { cn } from '@/lib/utils';
import { uploadFile, STORAGE_FOLDERS } from '@/lib/firebase/storage';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import './rich-text-editor.css';

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    onClick,
    isActive = false,
    disabled = false,
    title,
    children,
}) => (
    <button
        type="button"
        className={cn('rich-text-toolbar-btn', isActive && 'is-active')}
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={title}
    >
        {children}
    </button>
);

const ToolbarGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("rich-text-toolbar-group", className)}>{children}</div>
);

const COLORS = [
    { label: 'Padrão', color: 'inherit' },
    { label: 'Cinza', color: '#787774' },
    { label: 'Marrom', color: '#976d57' },
    { label: 'Laranja', color: '#d9730d' },
    { label: 'Amarelo', color: '#dfab01' },
    { label: 'Verde', color: '#448361' },
    { label: 'Azul', color: '#337ea9' },
    { label: 'Roxo', color: '#9065b0' },
    { label: 'Rosa', color: '#c14c8a' },
    { label: 'Vermelho', color: '#d44c47' },
];

const HIGHLIGHT_COLORS = [
    { label: 'Amarelo', color: '#fff3bf' },
    { label: 'Verde', color: '#d3f9d8' },
    { label: 'Azul', color: '#d0ebff' },
    { label: 'Rosa', color: '#ffe3e3' },
    { label: 'Laranja', color: '#ffd8a8' },
];

const FONT_SIZES = [
    { label: '12', value: '12px' },
    { label: '14', value: '14px' },
    { label: '16', value: '16px' },
    { label: '18', value: '18px' },
    { label: '20', value: '20px' },
    { label: '24', value: '24px' },
];

const LINE_HEIGHTS = [
    { label: 'Compacto', value: 'compact' },
    { label: 'Normal', value: 'normal' },
    { label: 'Confortável', value: 'comfortable' },
];

interface RichTextToolbarProps {
    className?: string;
    imageUploadFolder?: string;
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ className, imageUploadFolder }) => {
    const { activeEditor: editor } = useRichTextContext();
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const MAX_IMAGE_DIMENSION = 1400;
    const INITIAL_QUALITY = 0.8;
    const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [lineHeightMode, setLineHeightMode] = useState<'compact' | 'normal' | 'comfortable'>('normal');
    const [commandModalOpen, setCommandModalOpen] = useState(false);
    const [selectedCommandId, setSelectedCommandId] = useState('text');

    if (!editor) return null;

    const addImage = () => {
        const url = window.prompt('URL da Imagem:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const getPreferredImageType = () => {
        const canvas = document.createElement('canvas');
        const webp = canvas.toDataURL('image/webp');
        return webp.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
    };

    const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
        new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Falha ao gerar imagem.'));
                    return;
                }
                resolve(blob);
            }, type, quality);
        });

    const resizeAndCompressImage = async (file: File) => {
        const img = await createImageBitmap(file);
        try {
            const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
            let targetWidth = Math.max(1, Math.round(img.width * scale));
            let targetHeight = Math.max(1, Math.round(img.height * scale));

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas não suportado.');

            const mimeType = getPreferredImageType();
            let quality = INITIAL_QUALITY;

            const draw = () => {
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                ctx.clearRect(0, 0, targetWidth, targetHeight);
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            };

            draw();
            let blob = await canvasToBlob(canvas, mimeType, quality);

            while (blob.size > MAX_IMAGE_BYTES && quality > 0.6) {
                quality -= 0.08;
                blob = await canvasToBlob(canvas, mimeType, quality);
            }

            while (blob.size > MAX_IMAGE_BYTES && targetWidth > 400 && targetHeight > 400) {
                targetWidth = Math.max(1, Math.round(targetWidth * 0.85));
                targetHeight = Math.max(1, Math.round(targetHeight * 0.85));
                quality = 0.82;
                draw();
                blob = await canvasToBlob(canvas, mimeType, quality);
            }

            const baseName = file.name.replace(/\.[^/.]+$/, '') || 'imagem';
            const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
            return new File([blob], `${baseName}.${extension}`, { type: mimeType });
        } finally {
            img.close?.();
        }
    };

    const addImageFromFile = async (file?: File | null) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione um arquivo de imagem válido.');
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPendingImageFile(file);
        setPreviewUrl(objectUrl);
    };

    const setLineHeight = (mode: 'compact' | 'normal' | 'comfortable') => {
        setLineHeightMode(mode);
        const root = editor?.view.dom?.closest('.rich-text-editor') as HTMLElement | null;
        if (root) {
            root.setAttribute('data-line-height', mode);
        }
    };

    const setFontSize = (size: string) => {
        editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    };

    const clearFormatting = () => {
        editor.chain().focus().clearNodes().unsetAllMarks().run();
    };

    const copyAsText = async () => {
        try {
            await navigator.clipboard.writeText(editor.getText());
            toast.success('Texto copiado.');
        } catch (error) {
            toast.error('Não foi possível copiar o texto.');
        }
    };

    const insertCallout = (type: 'info' | 'success' | 'warning') => {
        const config = {
            info: { emoji: '💡', title: 'Dica', className: 'notion-callout--info' },
            success: { emoji: '✅', title: 'Sucesso', className: 'notion-callout--success' },
            warning: { emoji: '⚠️', title: 'Atenção', className: 'notion-callout--warning' },
        }[type];

        editor
            .chain()
            .focus()
            .insertContent(
                `<div class="notion-callout ${config.className}"><span class="notion-callout-icon">${config.emoji}</span><div class="notion-callout-content"><p><strong>${config.title}:</strong> </p></div></div>`
            )
            .run();
    };

    const commandItems = [
        {
            id: 'text',
            title: 'Texto',
            description: 'Parágrafo simples.',
            preview: '<p>Escreva aqui o texto da evolução.</p>',
            action: () => editor.chain().focus().setNode('paragraph').run(),
        },
        {
            id: 'h2',
            title: 'Título 2',
            description: 'Seção principal.',
            preview: '<h2>Título de Seção</h2>',
            action: () => editor.chain().focus().setNode('heading', { level: 2 }).run(),
        },
        {
            id: 'h3',
            title: 'Título 3',
            description: 'Subseção.',
            preview: '<h3>Subtítulo</h3>',
            action: () => editor.chain().focus().setNode('heading', { level: 3 }).run(),
        },
        {
            id: 'checklist',
            title: 'Checklist',
            description: 'Tarefas com status.',
            preview: '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Item 1</p></li><li data-type="taskItem" data-checked="true"><p>Item 2</p></li></ul>',
            action: () => editor.chain().focus().toggleTaskList().run(),
        },
        {
            id: 'bullets',
            title: 'Lista',
            description: 'Marcadores simples.',
            preview: '<ul><li><p>Item</p></li><li><p>Item</p></li></ul>',
            action: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
            id: 'ordered',
            title: 'Lista numerada',
            description: 'Sequência ordenada.',
            preview: '<ol><li><p>Item</p></li><li><p>Item</p></li></ol>',
            action: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
            id: 'table',
            title: 'Tabela',
            description: 'Tabela 3x3.',
            preview: '<table class="notion-table"><tr><th>Coluna</th><th>Coluna</th><th>Coluna</th></tr><tr><td>...</td><td>...</td><td>...</td></tr></table>',
            action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        },
        {
            id: 'divider',
            title: 'Divisor',
            description: 'Linha separadora.',
            preview: '<hr />',
            action: () => editor.chain().focus().setHorizontalRule().run(),
        },
        {
            id: 'quote',
            title: 'Citação',
            description: 'Bloco de citação.',
            preview: '<blockquote><p>Texto destacado</p></blockquote>',
            action: () => editor.chain().focus().toggleBlockquote().run(),
        },
        {
            id: 'code',
            title: 'Bloco de código',
            description: 'Código formatado.',
            preview: '<pre class="notion-code-block"><code>const exemplo = true;</code></pre>',
            action: () => editor.chain().focus().toggleCodeBlock().run(),
        },
        {
            id: 'callout-info',
            title: 'Callout (Info)',
            description: 'Dica ou observação.',
            preview: '<div class="notion-callout notion-callout--info"><span class="notion-callout-icon">💡</span><div class="notion-callout-content"><p><strong>Dica:</strong> Conteúdo</p></div></div>',
            action: () => insertCallout('info'),
        },
        {
            id: 'callout-success',
            title: 'Callout (Sucesso)',
            description: 'Evolução positiva.',
            preview: '<div class="notion-callout notion-callout--success"><span class="notion-callout-icon">✅</span><div class="notion-callout-content"><p><strong>Sucesso:</strong> Conteúdo</p></div></div>',
            action: () => insertCallout('success'),
        },
        {
            id: 'callout-warning',
            title: 'Callout (Alerta)',
            description: 'Atenção clínica.',
            preview: '<div class="notion-callout notion-callout--warning"><span class="notion-callout-icon">⚠️</span><div class="notion-callout-content"><p><strong>Atenção:</strong> Conteúdo</p></div></div>',
            action: () => insertCallout('warning'),
        },
        {
            id: 'image',
            title: 'Imagem',
            description: 'Inserir imagem.',
            preview: '<div class="command-preview-image">Imagem</div>',
            action: () => imageInputRef.current?.click(),
        },
    ];

    const selectedCommand = commandItems.find((item) => item.id === selectedCommandId) || commandItems[0];

    const handleClosePreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPendingImageFile(null);
        setIsUploading(false);
        setUploadProgress(0);
    };

    const handleConfirmInsert = async () => {
        if (!pendingImageFile) return;
        if (pendingImageFile.size > MAX_IMAGE_BYTES) {
            toast.info('Imagem maior que 5 MB. O sistema vai compactar para ficar abaixo de 5 MB.');
        }

        setIsUploading(true);
        setUploadProgress(0);

        let processedFile: File;
        try {
            processedFile = await resizeAndCompressImage(pendingImageFile);
        } catch (error) {
            toast.error('Não foi possível processar a imagem.');
            setIsUploading(false);
            return;
        }

        try {
            const result = await uploadFile(processedFile, {
                folder: imageUploadFolder || STORAGE_FOLDERS.IMAGES,
                contentType: processedFile.type,
                resumable: true,
                includeUserIdPath: !imageUploadFolder,
                onProgress: (progress) => setUploadProgress(progress),
                metadata: {
                    source: 'rich-text',
                    resized: String(true),
                    originalName: pendingImageFile.name,
                },
            });
            editor.chain().focus().setImage({ src: result.url }).run();
            toast.success('Imagem inserida.');
            handleClosePreview();
        } catch (error) {
            toast.error('Erro ao enviar imagem.');
            setIsUploading(false);
        }
    };

    const addYoutubeVideo = () => {
        const url = window.prompt('URL do YouTube:');
        if (url) {
            editor.chain().focus().setYoutubeVideo({ src: url }).run();
        }
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL:', previousUrl);

        if (url === null) return;

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const isInTable = editor.isActive('table');

    return (
        <div
            className={cn(
                "rich-text-toolbar sticky top-0 z-50 flex flex-wrap gap-1 px-4 py-1.5 border-b border-border/40 bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300",
                className
            )}
        >
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null;
                    addImageFromFile(file);
                    e.currentTarget.value = '';
                }}
            />
            <Dialog open={!!previewUrl} onOpenChange={(open) => !open && handleClosePreview()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Pré-visualização da imagem</DialogTitle>
                    </DialogHeader>
                    {previewUrl && (
                        <div className="space-y-3">
                            <img src={previewUrl} alt="Pré-visualização" className="w-full max-h-[55vh] object-contain rounded-md border" />
                            {pendingImageFile?.size && pendingImageFile.size > MAX_IMAGE_BYTES && (
                                <p className="text-xs text-amber-600">
                                    A imagem passa de 5 MB. Vamos compactar para ficar abaixo de 5 MB antes do envio.
                                </p>
                            )}
                            {isUploading && (
                                <div className="space-y-2">
                                    <Progress value={uploadProgress} className="h-2" />
                                    <p className="text-xs text-muted-foreground">Enviando: {Math.round(uploadProgress)}%</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={handleClosePreview} disabled={isUploading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmInsert} disabled={isUploading}>
                            {isUploading ? 'Enviando...' : 'Inserir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={commandModalOpen} onOpenChange={setCommandModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Comandos e Blocos</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
                        <div className="border rounded-lg p-2 max-h-[60vh] overflow-y-auto">
                            {commandItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedCommandId(item.id)}
                                    className={cn(
                                        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                                        selectedCommandId === item.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                    )}
                                >
                                    <div className="font-medium">{item.title}</div>
                                    <div className="text-[11px] text-muted-foreground">{item.description}</div>
                                </button>
                            ))}
                        </div>
                        <div className="border rounded-lg p-4 bg-white">
                            <div className="text-xs text-muted-foreground mb-2">Pré-visualização</div>
                            <div
                                className="command-preview rich-text-editor"
                                data-line-height="normal"
                                dangerouslySetInnerHTML={{ __html: selectedCommand.preview }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCommandModalOpen(false)}>
                            Fechar
                        </Button>
                        <Button
                            onClick={() => {
                                selectedCommand.action();
                                setCommandModalOpen(false);
                            }}
                        >
                            Inserir bloco
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="max-w-[1200px] mx-auto w-full flex items-center flex-wrap gap-x-3 gap-y-2 overflow-x-auto no-scrollbar">

                {/* ── Text Formatting ── */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                        title="Negrito (Ctrl+B)"
                    >
                        <Bold className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                        title="Itálico (Ctrl+I)"
                    >
                        <Italic className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        isActive={editor.isActive('underline')}
                        title="Sublinhado (Ctrl+U)"
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive('strike')}
                        title="Riscado"
                    >
                        <Strikethrough className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>

                {/* ── Text Styling (Sub/Super/Highlight) ── */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        isActive={editor.isActive('highlight')}
                        title="Realçar"
                    >
                        <Highlighter className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleSubscript().run()}
                        isActive={editor.isActive('subscript')}
                        title="Subscrito"
                    >
                        <div className="relative">
                            <span className="text-xs">x</span>
                            <span className="text-[8px] absolute -bottom-1 -right-1">2</span>
                        </div>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleSuperscript().run()}
                        isActive={editor.isActive('superscript')}
                        title="Sobrescrito"
                    >
                        <div className="relative">
                            <span className="text-xs">x</span>
                            <span className="text-[8px] absolute -top-1 -right-1">2</span>
                        </div>
                    </ToolbarButton>

                    {/* Color Picker Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="rich-text-toolbar-btn group" title="Cor do texto">
                                <Palette className="h-4 w-4" style={{ color: editor.getAttributes('textStyle').color || 'currentColor' }} />
                                <ChevronDown className="h-3 w-3 ml-0.5 text-muted-foreground group-hover:text-foreground" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" align="start">
                            <div className="grid grid-cols-5 gap-1">
                                {COLORS.map((c) => (
                                    <button
                                        key={c.color}
                                        className="w-8 h-8 rounded-md border border-border flex items-center justify-center hover:scale-110 transition-transform"
                                        style={{ backgroundColor: c.color === 'inherit' ? '#fff' : c.color }}
                                        onClick={() => {
                                            if (c.color === 'inherit') {
                                                editor.chain().focus().unsetColor().run();
                                            } else {
                                                editor.chain().focus().setColor(c.color).run();
                                            }
                                        }}
                                        title={c.label}
                                    >
                                        {c.color === 'inherit' && <Minus className="h-4 w-4 text-slate-300" />}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Highlight Color */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="rich-text-toolbar-btn group" title="Cor de fundo do texto">
                                <Highlighter className="h-4 w-4" />
                                <ChevronDown className="h-3 w-3 ml-0.5 text-muted-foreground group-hover:text-foreground" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-2" align="start">
                            <div className="grid grid-cols-5 gap-1">
                                {HIGHLIGHT_COLORS.map((c) => (
                                    <button
                                        key={c.color}
                                        className="w-7 h-7 rounded-md border border-border hover:scale-110 transition-transform"
                                        style={{ backgroundColor: c.color }}
                                        onClick={() => editor.chain().focus().setHighlight({ color: c.color }).run()}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </ToolbarGroup>

                {/* ── Headings ── */}
                <ToolbarGroup>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="rich-text-toolbar-btn-long group px-2 flex items-center gap-2 min-w-[100px]" title="Tipo de texto">
                                <Type className="h-4 w-4" />
                                <span className="text-xs font-medium truncate">
                                    {editor.isActive('heading', { level: 1 }) ? 'Título 1' :
                                        editor.isActive('heading', { level: 2 }) ? 'Título 2' :
                                            editor.isActive('heading', { level: 3 }) ? 'Título 3' : 'Parágrafo'}
                                </span>
                                <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                                <Type className="h-4 w-4 mr-2" /> Parágrafo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="font-bold text-lg">
                                <Heading1 className="h-4 w-4 mr-2" /> Título 1
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="font-semibold text-base">
                                <Heading2 className="h-4 w-4 mr-2" /> Título 2
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className="font-medium text-sm">
                                <Heading3 className="h-4 w-4 mr-2" /> Título 3
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </ToolbarGroup>

                {/* ── Font Size + Line Spacing ── */}
                <ToolbarGroup>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="rich-text-toolbar-btn-long group px-2 flex items-center gap-2 min-w-[96px]" title="Tamanho da fonte">
                                <Type className="h-4 w-4" />
                                <span className="text-xs font-medium truncate">Fonte</span>
                                <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {FONT_SIZES.map((size) => (
                                <DropdownMenuItem key={size.value} onClick={() => setFontSize(size.value)}>
                                    {size.label}px
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="rich-text-toolbar-btn-long group px-2 flex items-center gap-2 min-w-[110px]" title="Espaçamento">
                                <AlignJustify className="h-4 w-4" />
                                <span className="text-xs font-medium truncate">
                                    {lineHeightMode === 'compact' ? 'Compacto' : lineHeightMode === 'comfortable' ? 'Confortável' : 'Normal'}
                                </span>
                                <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground group-hover:text-foreground" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {LINE_HEIGHTS.map((item) => (
                                <DropdownMenuItem key={item.value} onClick={() => setLineHeight(item.value as any)}>
                                    {item.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </ToolbarGroup>

                {/* ── Lists ── */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                        title="Lista com marcadores"
                    >
                        <List className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                        title="Lista numerada"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                        isActive={editor.isActive('taskList')}
                        title="Lista de tarefas"
                    >
                        <CheckSquare className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>

                {/* ── Alignment ── */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        isActive={editor.isActive({ textAlign: 'left' })}
                        title="Alinhar à esquerda"
                    >
                        <AlignLeft className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        isActive={editor.isActive({ textAlign: 'center' })}
                        title="Centralizar"
                    >
                        <AlignCenter className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        isActive={editor.isActive({ textAlign: 'right' })}
                        title="Alinhar à direita"
                    >
                        <AlignRight className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                        isActive={editor.isActive({ textAlign: 'justify' })}
                        title="Justificar"
                    >
                        <AlignJustify className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>

                {/* ── Insert Menu ── */}
                <ToolbarGroup>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="rich-text-toolbar-btn-long bg-primary/5 text-primary hover:bg-primary/10 px-2 flex items-center gap-1.5" title="Inserir mídia ou blocos">
                                <Plus className="h-4 w-4" />
                                <span className="text-xs font-semibold">Inserir</span>
                                <ChevronDown className="h-3 w-3" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                                <Image className="h-4 w-4 mr-2 text-rose-500" /> Imagem (arquivo)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={addImage}>
                                <Image className="h-4 w-4 mr-2 text-rose-500" /> Imagem (URL)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={addYoutubeVideo}>
                                <Youtube className="h-4 w-4 mr-2 text-red-600" /> Vídeo YouTube
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={setLink}>
                                <Link className="h-4 w-4 mr-2 text-blue-500" /> Hyperlink
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                                <TableIcon className="h-4 w-4 mr-2 text-emerald-500" /> Tabela
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                                <Code className="h-4 w-4 mr-2 text-amber-600" /> Bloco de Código
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                                <Quote className="h-4 w-4 mr-2 text-slate-400" /> Citação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                                <Minus className="h-4 w-4 mr-2 text-slate-300" /> Linha Divisória
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => insertCallout('info')}>
                                <Info className="h-4 w-4 mr-2 text-sky-500" /> Callout - Info
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertCallout('success')}>
                                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Callout - Sucesso
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertCallout('warning')}>
                                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" /> Callout - Alerta
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </ToolbarGroup>

                {/* ── Command Modal ── */}
                <ToolbarGroup>
                    <button
                        type="button"
                        className="rich-text-toolbar-btn-long group px-2 flex items-center gap-1.5"
                        title="Comandos"
                        onClick={() => setCommandModalOpen(true)}
                    >
                        <CommandIcon className="h-4 w-4" />
                        <span className="text-xs font-semibold">Comandos</span>
                    </button>
                    <button
                        type="button"
                        className="rich-text-toolbar-btn-long group px-2 flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100"
                        title="Biblioteca de Exercícios"
                        onClick={() => {
                            (window as any).__OPEN_EXERCISE_LIBRARY = true;
                            // Trigger slash command to ensure CommandList is mounted or at least signal it
                            editor.chain().focus().insertContent('/').run();
                            // Optionally delete the slash immediately if we can, 
                            // but usually CommandList handles it.
                        }}
                    >
                        <Dumbbell className="h-4 w-4" />
                        <span className="text-xs font-semibold">Biblioteca</span>
                    </button>
                </ToolbarGroup>

                {/* ── Quick Actions ── */}
                <ToolbarGroup>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                        isActive={editor.isActive('taskList')}
                        title="Checklist"
                    >
                        <CheckSquare className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                        title="Tabela"
                    >
                        <TableIcon className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        title="Divisor"
                    >
                        <Minus className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => imageInputRef.current?.click()}
                        title="Imagem"
                    >
                        <Image className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>

                {/* ── Contextual Table Actions ── */}
                {isInTable && (
                    <ToolbarGroup className="bg-emerald-50/50 border-emerald-100 px-1 py-0.5 rounded-md animate-in slide-in-from-left-2 duration-300">
                        <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} title="Adicionar linha acima">
                            <Rows className="h-4 w-4 rotate-180" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Adicionar linha abaixo">
                            <Rows className="h-4 w-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} title="Adicionar coluna à esquerda">
                            <Columns className="h-4 w-4 -rotate-90" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Adicionar coluna à direita">
                            <Columns className="h-4 w-4 rotate-90" />
                        </ToolbarButton>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="rich-text-toolbar-btn text-rose-600" title="Excluir...">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} className="text-rose-600">
                                    Excluir Linha
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} className="text-rose-600">
                                    Excluir Coluna
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} className="text-rose-700 font-bold">
                                    Excluir Tabela Completa
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </ToolbarGroup>
                )}

                {/* ── History (Undo / Redo) ── */}
                <ToolbarGroup className="ml-auto">
                    <ToolbarButton
                        onClick={clearFormatting}
                        title="Limpar formatação"
                    >
                        <Eraser className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={copyAsText}
                        title="Copiar como texto"
                    >
                        <ClipboardCopy className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Desfazer (Ctrl+Z)"
                    >
                        <Undo2 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Refazer (Ctrl+Shift+Z)"
                    >
                        <Redo2 className="h-4 w-4" />
                    </ToolbarButton>
                </ToolbarGroup>
            </div>
        </div>
    );
};
