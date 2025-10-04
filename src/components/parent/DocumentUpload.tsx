import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, Loader2, Edit2, Plus, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PaginatedPageMultiSelect } from '@/components/ui/paginated-page-multi-select';
import { useChildSubjects } from '@/hooks/useChildSubjects';
import { useChildClasses } from '@/hooks/useChildClasses';
// @ts-ignore - Vite worker import provides a Worker constructor
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?worker';
// pdf.js core
import * as pdfjs from 'pdfjs-dist';

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
  const [title, setTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
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
  
  // Use child assignments hooks
  const { uniqueSubjects, isLoading: loadingSubjects } = useChildSubjects();
  const { uniqueClasses, isLoading: loadingClasses } = useChildClasses();
  // Remove the fetch subjects effect since we're using hooks now
  // Removed fetchUsedPages - no longer using document_page_selections
  // Removed page selection logic
  const generateTitleWithPages = () => {
    if (!originalFileName) return '';
    const baseName = originalFileName.replace(/\.pdf$/i, '');
    if (selectedPages.length === 0) {
      return baseName;
    } else if (selectedPages.length === 1) {
      return `${baseName} - Page ${selectedPages[0]}`;
    } else {
      // Sort pages and create ranges
      const sortedPages = [...selectedPages].sort((a, b) => a - b);
      const ranges: string[] = [];
      let rangeStart = sortedPages[0];
      let rangeEnd = sortedPages[0];
      for (let i = 1; i < sortedPages.length; i++) {
        if (sortedPages[i] === rangeEnd + 1) {
          rangeEnd = sortedPages[i];
        } else {
          if (rangeStart === rangeEnd) {
            ranges.push(`${rangeStart}`);
          } else {
            ranges.push(`${rangeStart}-${rangeEnd}`);
          }
          rangeStart = sortedPages[i];
          rangeEnd = sortedPages[i];
        }
      }

      // Add the last range
      if (rangeStart === rangeEnd) {
        ranges.push(`${rangeStart}`);
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
      return `${baseName} - Pages ${ranges.join(', ')}`;
    }
  };

  // Update title when pages selection changes
  React.useEffect(() => {
    if (!isEditingTitle && originalFileName) {
      setTitle(generateTitleWithPages());
    }
  }, [selectedPages, originalFileName, isEditingTitle]);
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
    const fileName = selectedFile.name.replace(/\.pdf$/i, '');
    setOriginalFileName(selectedFile.name);
    setTitle(fileName);
    setIsEditingTitle(false);

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
  const handleTitleToggle = () => {
    if (isEditingTitle) {
      setIsEditingTitle(false);
      setTitle(generateTitleWithPages());
    } else {
      setIsEditingTitle(true);
    }
  };
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    // If user manually changes title, don't auto-update it anymore for this session
    if (newTitle !== generateTitleWithPages()) {
      setIsEditingTitle(true);
    }
  };
  const handleUpload = async () => {
    if (!file || !title || !subject || !classLevel) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select a file.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const {
        data: user
      } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Extract text directly from PDF without storing original file
      const buf = await file.arrayBuffer();
      const doc = await (pdfjs as any).getDocument({
        data: new Uint8Array(buf)
      }).promise;

      // Save document metadata (no file storage, no markdown_content)
      const {
        data: documentData,
        error: dbError
      } = await supabase.from('documents').insert({
        user_id: user.user.id,
        title,
        subject_id: subject,
        class_level: classLevel as any,
        processing_status: 'completed',
        total_pages: doc.numPages
      }).select().single();
      if (dbError) throw dbError;

      // Store each page's content individually in document_pages
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        const { error: pageError } = await supabase
          .from('document_pages')
          .insert({
            document_id: documentData.id,
            page_number: i,
            content: pageText
          });
        
        if (pageError) throw pageError;
      }

      // Removed page selection and book creation logic

      toast({
        title: "Document uploaded successfully",
        description: "Your document has been processed and each page stored individually.",
      });

      // Reset form
      setFile(null);
      setOriginalFileName('');
      setTitle('');
      setSubject('');
      setClassLevel('');
      setSelectedPages([]);
      setAvailablePages([]);
      setIsEditingTitle(false);
      onDocumentUploaded();
    } catch (error: any) {
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
          <Label htmlFor="title">Title</Label>
          <div className="flex gap-2 mt-1">
            <Input id="title" value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="Enter title" className="flex-1" readOnly={!isEditingTitle} />
            {originalFileName && <Button type="button" variant="outline" size="icon" onClick={handleTitleToggle} title={isEditingTitle ? 'Switch to Automatic title' : 'Switch to Manual title'}>
                {isEditingTitle ? <Sparkles className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
              </Button>}
          </div>
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
                <SelectItem value="_no_subjects" disabled>No subjects assigned to children</SelectItem>
              ) : (
                uniqueSubjects.map((subj) => (
                  <SelectItem key={subj.id} value={subj.id}>
                    {subj.name}
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
                <SelectItem value="_no_classes" disabled>No classes assigned to children</SelectItem>
              ) : (
                uniqueClasses.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Pages</Label>
          <div className="mt-2">
            <PaginatedPageMultiSelect label="Select Pages" availablePages={availablePages} selectedPages={selectedPages} onChange={setSelectedPages} disabled={!file || !subject || !classLevel || loadingPages || availablePages.length === 0} disabledPages={[]} maxSelectable={numPages} onLimitExceeded={() => toast({
            title: 'Selection limit reached',
            description: `You can select up to ${numPages} pages for this document.`,
            variant: 'destructive'
          })} className="w-full" />
            {loadingPages && <div className="text-xs text-muted-foreground mt-1">Reading PDF pages...</div>}
            {!loadingPages && file && availablePages.length === 0 && <div className="text-xs text-muted-foreground mt-1">No pages detected yet.</div>}
          </div>
        </div>
 
        <Button onClick={handleUpload} disabled={!file || !title || !subject || !classLevel || isUploading || numPages === 0 || selectedPages.length !== numPages} className="w-full">
          {isUploading ? <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </> : 'Upload Pages'}
        </Button>
      </CardContent>
    </Card>;
};