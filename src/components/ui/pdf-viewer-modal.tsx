import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ZoomIn, ZoomOut, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// @ts-ignore - Vite worker import provides a Worker constructor
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?worker';
import * as pdfjs from 'pdfjs-dist';

// Initialize pdf.js worker
// @ts-ignore
(pdfjs as any).GlobalWorkerOptions.workerPort = new (pdfjsWorker as any)();

interface PdfViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath?: string;
  title?: string;
  documentId?: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ open, onOpenChange, filePath, title }) => {
  const { toast } = useToast();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const docRef = useRef<any>(null);

  // canvases refs map per page
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const reset = () => {
    setSignedUrl(null);
    setNumPages(0);
    setScale(1.0);
    if (docRef.current) {
      try { docRef.current.destroy(); } catch {}
      docRef.current = null;
    }
    canvasRefs.current.clear();
  };

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    const load = async () => {
      if (!filePath) return;
      setLoading(true);
      try {
        setSignedUrl(filePath);

        const pdf = await (pdfjs as any).getDocument({ url: filePath }).promise;
        docRef.current = pdf;
        setNumPages(pdf.numPages);
      } catch (e: any) {
      console.error('Error:', e);
        toast({ title: 'Unable to load PDF', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      reset();
    };
  }, [open, filePath]);

  const renderPage = async (pageNumber: number) => {
    const pdf = docRef.current;
    const canvas = canvasRefs.current.get(pageNumber);
    if (!pdf || !canvas) return;

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = { canvasContext: context, viewport };
    await page.render(renderContext).promise;
  };

  useEffect(() => {
    // re-render all pages on scale change
    if (!docRef.current) return;
    for (let i = 1; i <= numPages; i++) {
      renderPage(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, numPages]);

  const handleZoomIn = () => setScale((s) => Math.min(3, parseFloat((s + 0.25).toFixed(2))));
  const handleZoomOut = () => setScale((s) => Math.max(0.5, parseFloat((s - 0.25).toFixed(2))));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-[95vw] w-[95vw] h-[90vh] p-0 bg-background z-50">
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="truncate">{title || 'Pages Viewer'}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" onClick={handleZoomOut} aria-label="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={handleZoomIn} aria-label="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="h-[calc(90vh-56px)]">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading PDF...
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="px-6 py-4 space-y-8">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <div key={pageNum} className="space-y-2">
                    <div className="text-xs text-muted-foreground">Page {pageNum}</div>
                    <canvas
                      ref={(el) => {
                        if (!el) return;
                        canvasRefs.current.set(pageNum, el);
                        // initial render
                        renderPage(pageNum);
                      }}
                      className="mx-auto shadow-sm border rounded"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewerModal;
