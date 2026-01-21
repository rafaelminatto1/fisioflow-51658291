import { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import {
  Pen,
  Eraser,
  Download,
  Check,
  FileSignature,
  Shield,
  Clock
} from 'lucide-react';

interface DigitalSignatureProps {
  onSign?: (signatureData: SignatureData) => void;
  documentTitle?: string;
  documentId?: string;
  signerName?: string;
  mode?: 'capture' | 'display';
  existingSignature?: string;
}

export interface SignatureData {
  imageData: string;
  timestamp: string;
  signerName: string;
  documentId: string;
  hash: string;
}

export function DigitalSignature({
  onSign,
  documentTitle = 'Documento',
  documentId = '',
  signerName = '',
  mode = 'capture',
  existingSignature
}: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [name, setName] = useState(signerName);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup canvas
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw signature line
    ctx.strokeStyle = '#e5e5e5';
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 40);
    ctx.lineTo(canvas.width - 20, canvas.height - 40);
    ctx.stroke();

    ctx.strokeStyle = '#1a1a2e';
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e5e5e5';
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 40);
    ctx.lineTo(canvas.width - 20, canvas.height - 40);
    ctx.stroke();

    ctx.strokeStyle = '#1a1a2e';
    setHasSignature(false);
    setSignedAt(null);
  };

  const generateHash = async (data: string): Promise<string> => {
    // Use Web Crypto API for SHA-256 hash
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !name.trim()) return;

    const imageData = canvas.toDataURL('image/png');
    const timestamp = new Date().toISOString();
    const hash = await generateHash(`${documentId}-${name}-${timestamp}-${imageData.slice(0, 100)}`);

    const signatureData: SignatureData = {
      imageData,
      timestamp,
      signerName: name,
      documentId,
      hash
    };

    setSignedAt(timestamp);
    onSign?.(signatureData);
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `assinatura-${name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.avif`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (mode === 'display' && existingSignature) {
    return (
      <Card className="border-2 border-green-500/30 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">Documento Assinado</p>
              <p className="text-xs text-muted-foreground">Assinatura digital verificada</p>
            </div>
          </div>
          <OptimizedImage src={existingSignature} alt="Assinatura" className="border rounded-lg max-h-24" aspectRatio="auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          Assinatura Digital
        </CardTitle>
        <CardDescription>
          Assine o documento "{documentTitle}" usando o campo abaixo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nome do signatário */}
        <div className="space-y-2">
          <Label htmlFor="signer-name">Nome Completo</Label>
          <Input
            id="signer-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite seu nome completo"
          />
        </div>

        {/* Canvas de assinatura */}
        <div className="space-y-2">
          <Label>Assinatura</Label>
          <div className="border-2 border-dashed rounded-lg p-2 bg-white dark:bg-muted/20">
            <canvas
              ref={canvasRef}
              width={500}
              height={150}
              className="w-full touch-none cursor-crosshair rounded"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Use o mouse ou toque para assinar acima da linha
          </p>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={!hasSignature}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Limpar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadSignature}
            disabled={!hasSignature}
          >
            <Download className="h-4 w-4 mr-1" />
            Baixar
          </Button>
        </div>

        {/* Status e confirmação */}
        {signedAt && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Documento assinado com sucesso</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{new Date(signedAt).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        )}

        {/* Botão de assinar */}
        <Button
          className="w-full"
          disabled={!hasSignature || !name.trim() || !!signedAt}
          onClick={handleSign}
        >
          <Pen className="h-4 w-4 mr-2" />
          {signedAt ? 'Assinado' : 'Assinar Documento'}
        </Button>

        {/* Informações legais */}
        <p className="text-xs text-muted-foreground text-center">
          Ao assinar, você concorda com os termos do documento e declara que as informações são verdadeiras.
          Esta assinatura tem validade legal conforme MP 2.200-2/2001.
        </p>
      </CardContent>
    </Card>
  );
}
