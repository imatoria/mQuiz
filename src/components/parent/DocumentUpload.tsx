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
import { CustomSubjectInput } from '@/components/ui/custom-subject-input';
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
  const [subjects, setSubjects] = useState<any[]>([]);
  const {
    toast
  } = useToast();
  const [numPages, setNumPages] = useState(0);
  const [availablePages, setAvailablePages] = useState<number[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [usedPages, setUsedPages] = useState<number[]>([]);
  const [loadingUsedPages, setLoadingUsedPages] = useState(false);
  React.useEffect(() => {
    fetchSubjects();
  }, []);
  const fetchSubjects = async () => {
    try {
      const {
        data: user
      } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch both global subjects and user's custom subjects
      const [globalSubjects, userSubjects] = await Promise.all([supabase.from('subjects').select('*').order('name'), (supabase as any).from('user_subjects').select('*').eq('user_id', user.user.id).order('name')]);
      const allSubjects = [...(globalSubjects.data || []), ...(userSubjects.data || [])];
      setSubjects(allSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };
  const fetchUsedPages = async () => {
    if (!subject || !classLevel) {
      setUsedPages([]);
      return;
    }
    try {
      setLoadingUsedPages(true);
      const {
        data: auth
      } = await supabase.auth.getUser();
      if (!auth.user) {
        setUsedPages([]);
        return;
      }
      const {
        data,
        error
      } = await supabase.from('document_page_selections').select('page_number').eq('user_id', auth.user.id).eq('subject_id', subject).eq('class_level', classLevel as any);
      if (error) {
        console.error('Error fetching used pages', error);
        setUsedPages([]);
      } else {
        const pages = Array.from(new Set((data || []).map((d: any) => d.page_number)));
        setUsedPages(pages);
      }
    } finally {
      setLoadingUsedPages(false);
    }
  };
  React.useEffect(() => {
    fetchUsedPages();
  }, [subject, classLevel]);
  React.useEffect(() => {
    // No-op: allow selecting pages even if previously used
  }, [usedPages]);
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

    // Allow adjusting existing page mappings for this subject & class
    setIsUploading(true);
    try {
      const {
        data: user
      } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      const fileName = `${user.user.id}/${Date.now()}-${file.name}`;

      // Upload file to storage
      const {
        error: uploadError
      } = await supabase.storage.from('documents').upload(fileName, file);
      if (uploadError) throw uploadError;

      // Save document metadata (without processing status for question generation)
      const {
        data: documentData,
        error: dbError
      } = await supabase.from('documents').insert({
        user_id: user.user.id,
        title,
        file_path: fileName,
        subject_id: subject,
        class_level: classLevel as any,
        processing_status: 'stored' // Just store, don't generate questions
      }).select().single();
      if (dbError) throw dbError;

      // Save selected page associations (ensure mapping and cleanup)
      if (selectedPages.length > 0) {
        // Fetch all current selections for this subject/class
        const { data: currentSelections, error: curSelErr } = await supabase
          .from('document_page_selections')
          .select('id, page_number, document_id')
          .eq('user_id', user.user.id)
          .eq('subject_id', subject)
          .eq('class_level', classLevel as any);

        if (curSelErr) throw curSelErr;

        const currentByPage = new Map<number, { id: string; document_id: string }>(
          (currentSelections || []).map((s: any) => [s.page_number, { id: s.id, document_id: s.document_id }])
        );

        // Insert any missing pages
        const missingToInsert = selectedPages
          .filter((p) => !currentByPage.has(p))
          .map((p) => ({
            user_id: user.user.id,
            document_id: documentData.id,
            subject_id: subject,
            class_level: classLevel as any,
            page_number: p,
          }));

        if (missingToInsert.length > 0) {
          const { error: insertSelErr2 } = await supabase
            .from('document_page_selections')
            .insert(missingToInsert);
          if (insertSelErr2) throw insertSelErr2;
        }

        // Update existing selected pages to point to this new document
        const pagesToUpdate = selectedPages.filter((p) => {
          const row = currentByPage.get(p);
          return row && row.document_id !== documentData.id;
        });
        if (pagesToUpdate.length > 0) {
          const { error: updErr } = await supabase
            .from('document_page_selections')
            .update({ document_id: documentData.id })
            .eq('user_id', user.user.id)
            .eq('subject_id', subject)
            .eq('class_level', classLevel as any)
            .in('page_number', pagesToUpdate);
          if (updErr) throw updErr;
        }

        // Delete any pages that are no longer selected
        const toDeleteIds = (currentSelections || [])
          .filter((s: any) => !selectedPages.includes(s.page_number))
          .map((s: any) => s.id);
        if (toDeleteIds.length > 0) {
          const { error: delSelErr } = await supabase
            .from('document_page_selections')
            .delete()
            .in('id', toDeleteIds);
          if (delSelErr) throw delSelErr;
        }
      }

      // Create/replace Book for this subject + class with these pages
      try {
        // Delete existing book (if any)
        const { data: existingBook } = await supabase
          .from('books')
          .select('id')
          .eq('author_id', user.user.id)
          .eq('subject_id', subject)
          .eq('class_level', classLevel as any)
          .maybeSingle();

        if (existingBook?.id) {
          // Remove existing book_documents first
          await supabase.from('book_documents').delete().eq('book_id', existingBook.id);
          await supabase.from('books').delete().eq('id', existingBook.id);
        }

        // Build a friendly title
        const { data: subjRow } = await supabase
          .from('subjects')
          .select('name')
          .eq('id', subject)
          .maybeSingle();

        const bookTitle = `${subjRow?.name || 'Subject'} - Class ${classLevel} - Pages Book`;

        const { data: newBook, error: bookErr } = await supabase
          .from('books')
          .insert({
            title: bookTitle,
            author_id: user.user.id,
            subject_id: subject,
            class_level: classLevel as any,
            is_published: false,
          })
          .select()
          .single();
        if (bookErr) throw bookErr;

        // Create book_documents ordered by selected page numbers
        const pagesSorted = [...selectedPages].sort((a, b) => a - b);
        const bookDocs = pagesSorted.map((p, idx) => ({
          book_id: newBook.id,
          document_id: documentData.id,
          chapter_number: p,
          order_index: idx + 1,
          chapter_title: `Page ${p}`,
        }));

        if (bookDocs.length > 0) {
          const { error: bdErr } = await supabase.from('book_documents').insert(bookDocs);
          if (bdErr) throw bdErr;
        }
      } catch (bookFlowErr) {
        console.warn('Book creation flow warning:', bookFlowErr);
      }

      // Extract and save document content without generating questions
      const { error: processError } = await supabase.functions.invoke('process-document', {
        body: {
          documentId: documentData.id,
          onlyExtract: true, // Flag to only extract content, not generate questions
        },
      });
      if (processError) {
        console.warn('Content extraction failed, but pages were uploaded:', processError);
      }
      toast({
        title: "Pages uploaded successfully",
        description: "Your pages were stored, mappings updated, and the book was rebuilt.",
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

        <CustomSubjectInput subjects={subjects} value={subject} onChange={setSubject} onSubjectsUpdate={fetchSubjects} />

        <div>
          <Label htmlFor="class">Class</Label>
          <div className="flex gap-2">
            <Select value={classLevel} onValueChange={setClassLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({
                length: 12
              }, (_, i) => i + 1).map(num => <SelectItem key={num} value={num.toString()}>
                    Class {num}
                  </SelectItem>)}
                {customClasses.map(c => <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="Add custom class level" className="h-10 w-10">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Class Level</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-class-name">Class Level</Label>
                    <Input id="new-class-name" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="e.g., 13 or A-Level" onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!newClassName.trim()) {
                        toast({
                          title: 'Class level required',
                          description: 'Please enter a class level.',
                          variant: 'destructive'
                        });
                        return;
                      }
                      const name = newClassName.trim();
                      setCustomClasses(prev => Array.from(new Set([...prev, name])));
                      setClassLevel(name);
                      setNewClassName('');
                      setIsClassDialogOpen(false);
                    }
                  }} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsClassDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={() => {
                    if (!newClassName.trim()) {
                      toast({
                        title: 'Class level required',
                        description: 'Please enter a class level.',
                        variant: 'destructive'
                      });
                      return;
                    }
                    const name = newClassName.trim();
                    setCustomClasses(prev => Array.from(new Set([...prev, name])));
                    setClassLevel(name);
                    setNewClassName('');
                    setIsClassDialogOpen(false);
                  }}>
                      Add Class
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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