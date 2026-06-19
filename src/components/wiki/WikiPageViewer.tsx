import DOMPurify from "dompurify";
/**
 * WikiPageViewer Component
 * Viewer for wiki pages with markdown rendering
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WikiPageViewerProps {
  pageId: string;
  content?: string;
  onEdit?: () => void;
  onClose?: () => void;
}

export function WikiPageViewer({ _pageId, content, onEdit, onClose }: WikiPageViewerProps) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardContent className="p-8">
        <div className="prose prose-slate max-w-none prose-headings:font-display prose-headings:font-bold prose-p:font-medium prose-p:text-slate-600 leading-relaxed">
          {content ? (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
               <div className="animate-pulse bg-slate-100 h-4 w-64 rounded-full mb-4" />
               <div className="animate-pulse bg-slate-100 h-4 w-48 rounded-full" />
            </div>
          )}
        </div>
        <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3">
          {onEdit && (
            <Button 
              onClick={onEdit}
              className="rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 h-10 px-6"
            >
              Editar Página
            </Button>
          )}
          {onClose && (
            <Button 
              variant="outline" 
              onClick={onClose}
              className="rounded-xl font-bold border-slate-200 h-10 px-6"
            >
              Fechar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
