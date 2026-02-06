/**
 * WikiPageViewer Component
 * Viewer for wiki pages with markdown rendering
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WikiPageViewerProps {
  pageId: string;
  content?: string;
  onEdit?: () => void;
  onClose?: () => void;
}

export function WikiPageViewer({ _pageId, content, onEdit, onClose }: WikiPageViewerProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="prose max-w-none">
          {content ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <p className="text-muted-foreground">Carregando conteúdo...</p>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          {onEdit && <Button onClick={onEdit}>Editar</Button>}
          {onClose && <Button variant="outline" onClick={onClose}>Fechar</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
