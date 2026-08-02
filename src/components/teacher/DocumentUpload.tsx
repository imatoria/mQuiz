import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, Loader2, Edit2, Plus, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { PaginatedPageMultiSelect } from '@/components/ui/paginated-page-multi-select';
import { useStudentSubjects } from '@/hooks/useStudentSubjects';
import { useStudentClasses } from '@/hooks/useStudentClasses';
// @ts-ignore - Vite worker import provides a Worker constructor
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?worker';
// pdf.js core
import * as pdfjs from 'pdfjs-dist';
import { createWorker, PSM } from 'tesseract.js';

// Initialize pdf.js worker
// @ts-ignore
(pdfjs as any).GlobalWorkerOptions.workerPort = new (pdfjsWorker as any)();
interface DocumentUploadProps {
  onDocumentUploaded: () => void;
}
export const DocumentUpload = ({
  onDocumentUploaded
}: DocumentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [originalFileName, setOriginalFileName] = useState('');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const {
    toast
  } = useToast();
  const [numPages, setNumPages] = useState(0);
  const [availablePages, setAvailablePages] = useState<number[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [usedPages, setUsedPages] = useState<number[]>([]);
  const [fetchingUsedPages, setFetchingUsedPages] = useState(false);
  
  // Use student assignments hooks
  const { uniqueSubjects, isLoading: loadingSubjects } = useStudentSubjects();
  const { uniqueClasses, isLoading: loadingClasses } = useStudentClasses();

  // Fetch already used pages for the selected subject and class
  React.useEffect(() => {
    const fetchUsedPages = async () => {
      if (!subject || !classLevel) {
        setUsedPages([]);
        return;
      }

      try {
        setFetchingUsedPages(true);
        const user = authService.getCurrentUser();
        if (!user) {
          setFetchingUsedPages(false);
          return;
        }

        // Get all documents for this user, subject, and class
        const { data: documents, error: docsError } = await dbService.getProvider().query(
          'SELECT id FROM documents WHERE user_id = ? AND subject_id = ? AND class_id = ?',
          [user.id, subject, classLevel]
        );

        if (docsError) throw docsError;
        if (!documents || documents.length === 0) {
          setUsedPages([]);
          setFetchingUsedPages(false);
          return;
        }

        const docIds = documents.map((d: any) => d.id);

        const placeholders = docIds.map(() => '?').join(',');
        // Get all page numbers for these documents
        const { data: pages, error: pagesError } = await dbService.getProvider().query(
          `SELECT page_number FROM document_pages WHERE document_id IN (${placeholders})`,
          docIds
        );

        if (pagesError) throw pagesError;

        const used = pages?.map((p: any) => p.page_number) || [];
        setUsedPages(used);

        // If any currently selected pages are now "used", remove them
        setSelectedPages(prev => prev.filter(p => !used.includes(p)));

      } catch (err) {
        console.error('Failed to fetch used pages', err);
      } finally {
        setFetchingUsedPages(false);
      }
    };

    fetchUsedPages();
  }, [subject, classLevel]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      setFile(null);
      setOriginalFileName('');
      setAvailablePages([]);
      setSelectedPages([]);
      setNumPages(0);
      setTitle('');
      setIsEditingTitle(false);
      toast({
        title: 'Invalid file type',
        description: 'Please select a PDF file.',
        variant: 'destructive'
      });
      return;
    }
    setFile(selectedFile);
    setOriginalFileName(selectedFile.name);

    // Detect pages using pdf.js
    try {
      setLoadingPages(true);
      const buf = await selectedFile.arrayBuffer();
      const doc = await (pdfjs as any).getDocument({
        data: new Uint8Array(buf)
      }).promise;
      // Determine how many physical pages the uploaded PDF has
      setNumPages(doc.numPages);

      // Use a larger global pool of page numbers for the subject+class mapping
      // This lets users assign any available global page numbers, independent of the PDF's own page indices
      const GLOBAL_POOL_SIZE = 1000; // adjust if needed
      const globalPoolPages = Array.from({
        length: GLOBAL_POOL_SIZE
      }, (_, i) => i + 1);
      setAvailablePages(globalPoolPages);
      setSelectedPages([]);
    } catch (err) {
      console.error('Failed to read PDF pages', err);
      setAvailablePages([]);
      setSelectedPages([]);
      setNumPages(0);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !subject || !classLevel) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select a file.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Extract text directly from PDF without storing original file
      const buf = await file.arrayBuffer();
      const doc = await (pdfjs as any).getDocument({
        data: new Uint8Array(buf)
      }).promise;

      const newDocId = crypto.randomUUID();
      const { error: dbError } = await dbService.getProvider().execute(
        'INSERT INTO documents (id, user_id, file_name, subject_id, class_id, processing_status, total_pages) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newDocId, user.id, originalFileName, subject, classLevel, 'completed', selectedPages.length > 0 ? selectedPages.length : doc.numPages]
      );
      if (dbError) throw dbError;
      const documentData = { id: newDocId };

      // Use selected pages or default to all pages of the uploaded document (1..doc.numPages)
      const pagesToProcess = selectedPages.length > 0 
        ? [...selectedPages].sort((a, b) => a - b)
        : Array.from({ length: doc.numPages }, (_, i) => i + 1);
      
      for (let pdfPageIndex = 1; pdfPageIndex <= doc.numPages; pdfPageIndex++) {
        // Map PDF page index to selected page number
        const selectedPageNumber = pagesToProcess[pdfPageIndex - 1] || pdfPageIndex;
        
        const page = await doc.getPage(pdfPageIndex);
        const textContent = await page.getTextContent();
        
        // Extract and clean text from page using positional awareness to preserve formatting
        let pageText = '';
        let lastY = -1;
        let lastX = -1;
        
        textContent.items.forEach((item: any) => {
          if (!item.str || typeof item.str !== 'string') return;
          
          const y = item.transform[5];
          const x = item.transform[4];
          const width = item.width || 0;
          
          if (lastY !== -1) {
            // Use a threshold to determine if it's a new line (Y difference)
            if (Math.abs(y - lastY) > 5) {
              pageText += '\n';
            } 
            // If on the same line, check if there's a significant gap between words
            else if (lastX !== -1 && (x - lastX) > 5) {
              pageText += ' ';
            }
          }
          
          pageText += item.str;
          
          lastY = y;
          lastX = x + width;
        });
        
        pageText = pageText
          .replace(/ +/g, ' ')       // Remove multiple horizontal spaces
          .replace(/\n +/g, '\n')    // Remove leading spaces on new lines
          .replace(/\n{3,}/g, '\n\n')// Limit consecutive newlines to 2 (paragraphs)
          .trim();
        
        console.log(`PDF Page ${pdfPageIndex} -> Selected Page ${selectedPageNumber}: Initial extraction: ${pageText.length} characters`);
        
        // If text extraction failed or returned minimal text, try OCR
        if (pageText.length < 50) {
          console.log(`PDF Page ${pdfPageIndex}: Text layer insufficient, attempting OCR...`);
          
          try {
            // Render page to canvas for OCR at higher resolution (scale: 2.5)
            const viewport = page.getViewport({ scale: 2.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              
              await page.render({
                canvasContext: context,
                viewport: viewport
              }).promise;
              
              // Initialize OCR worker if not already done
              if (!ocrWorker) {
                ocrWorker = await createWorker('eng');
                await ocrWorker.setParameters({
                  preserve_interword_spaces: '1',
                  tessedit_pageseg_mode: PSM.AUTO_OSD // Automatic page segmentation with OSD
                });
              }
              
              // Perform OCR on canvas
              const { data: { text: ocrText } } = await ocrWorker.recognize(canvas);
              const cleanedOcrText = ocrText.trim();
              
              console.log(`PDF Page ${pdfPageIndex}: OCR extracted ${cleanedOcrText.length} characters`);
              
              // Use OCR text if it's better than what we had
              if (cleanedOcrText.length > pageText.length) {
                pageText = cleanedOcrText;
                console.log(`PDF Page ${pdfPageIndex}: Using OCR text (preview: ${pageText.substring(0, 50)}...)`);
              }
            }
          } catch (ocrError) {
            console.error(`PDF Page ${pdfPageIndex}: OCR failed:`, ocrError);
            // Continue with whatever text we have
          }
        }
        
        const { error: pageError } = await dbService.getProvider().execute(
          'INSERT INTO document_pages (id, document_id, page_number, content) VALUES (?, ?, ?, ?)',
          [crypto.randomUUID(), documentData.id, selectedPageNumber, pageText || '']
        );
        
        if (pageError) {
          console.error(`Error inserting page ${selectedPageNumber}:`, pageError);
          throw pageError;
        }
      }
      
      // Cleanup OCR worker
      if (ocrWorker) {
        await ocrWorker.terminate();
      }

      // Removed page selection and book creation logic

      toast({
        title: "Document uploaded successfully",
        description: `${selectedPages.length} ${selectedPages.length === 1 ? 'page' : 'pages'} stored with original page numbers.`,
      });

      setFile(null);
      setOriginalFileName('');
      setSubject('');
      setClassLevel('');
      setSelectedPages([]);
      setAvailablePages([]);
      onDocumentUploaded();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Pages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="file"></Label>
          <div className="mt-1">
            <Input id="file" type="file" accept=".pdf" onChange={handleFileChange} className="cursor-pointer" />
          </div>
          {file && <div className="mt-2 flex items-center gap-2 text-base text-inherit">
              <FileText className="h-4 w-4" />
              {file.name}
            </div>}
        </div>


        <div>
          <Label htmlFor="subject">Subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {loadingSubjects ? (
                <SelectItem value="_loading" disabled>Loading subjects...</SelectItem>
              ) : uniqueSubjects.length === 0 ? (
                <SelectItem value="_no_subjects" disabled>No subjects assigned to students</SelectItem>
              ) : (
                uniqueSubjects.map((subj) => (
                  <SelectItem key={subj.id} value={subj.id}>
                    {subj.subject_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="class">Class</Label>
          <Select value={classLevel} onValueChange={setClassLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {loadingClasses ? (
                <SelectItem value="_loading" disabled>Loading classes...</SelectItem>
              ) : uniqueClasses.length === 0 ? (
                <SelectItem value="_no_classes" disabled>No classes assigned to students</SelectItem>
              ) : (
                uniqueClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.class_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Pages</Label>
          <div className="mt-2">
            <PaginatedPageMultiSelect label="Select Pages" availablePages={availablePages} selectedPages={selectedPages} onChange={setSelectedPages} disabled={!file || !subject || !classLevel || loadingPages || fetchingUsedPages || availablePages.length === 0} disabledPages={usedPages} maxSelectable={numPages} onLimitExceeded={() => toast({
            title: 'Selection limit reached',
            description: `You can select up to ${numPages} pages for this document.`,
            variant: 'destructive'
          })} className="w-full" />
            {loadingPages && <div className="text-xs text-muted-foreground mt-1">Reading PDF pages...</div>}
            {!loadingPages && file && availablePages.length === 0 && <div className="text-xs text-muted-foreground mt-1">No pages detected yet.</div>}
          </div>
        </div>
 
        <Button onClick={handleUpload} disabled={!file || !subject || !classLevel || isUploading || numPages === 0 || selectedPages.length === 0 || selectedPages.length > numPages} className="w-full">
          {isUploading ? <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </> : `Upload ${selectedPages.length} ${selectedPages.length === 1 ? 'Page' : 'Pages'}`}
        </Button>
      </CardContent>
    </Card>;
};