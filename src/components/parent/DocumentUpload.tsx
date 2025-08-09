
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Loader2, Edit2 } from 'lucide-react';
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

export const DocumentUpload = ({ onDocumentUploaded }: DocumentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [originalFileName, setOriginalFileName] = useState('');
  const [title, setTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const { toast } = useToast();
  const [numPages, setNumPages] = useState(0);
  const [availablePages, setAvailablePages] = useState<number[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  React.useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch both global subjects and user's custom subjects
      const [globalSubjects, userSubjects] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        (supabase as any).from('user_subjects').select('*').eq('user_id', user.user.id).order('name')
      ]);

      const allSubjects = [
        ...(globalSubjects.data || []),
        ...(userSubjects.data || [])
      ];

      setSubjects(allSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

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
        variant: 'destructive',
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
      const doc = await (pdfjs as any).getDocument({ data: new Uint8Array(buf) }).promise;
      const pages = Array.from({ length: doc.numPages }, (_, i) => i + 1);
      setNumPages(doc.numPages);
      setAvailablePages(pages);
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

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
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
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const fileName = `${user.user.id}/${Date.now()}-${file.name}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save document metadata (without processing status for question generation)
      const { data: documentData, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.user.id,
          title,
          file_path: fileName,
          subject_id: subject,
          class_level: classLevel as any,
          processing_status: 'stored' // Just store, don't generate questions
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Save selected page associations (optional)
      if (selectedPages.length > 0) {
        const { data: existing } = await supabase
          .from('document_page_selections')
          .select('page_number')
          .eq('user_id', user.user.id)
          .eq('subject_id', subject)
          .eq('class_level', classLevel as any)
          .in('page_number', selectedPages);

        const existingSet = new Set((existing || []).map((e: any) => e.page_number));
        const toInsert = selectedPages
          .filter((p) => !existingSet.has(p))
          .map((p) => ({
            user_id: user.user.id,
            document_id: documentData.id,
            subject_id: subject,
            class_level: classLevel as any,
            page_number: p,
          }));

        if (toInsert.length > 0) {
          const { error: insertSelErr } = await supabase
            .from('document_page_selections')
            .insert(toInsert);
          if (insertSelErr) throw insertSelErr;
        }

        const dupes = selectedPages.filter((p) => existingSet.has(p));
        if (dupes.length > 0) {
          toast({
            title: 'Some pages already used',
            description: `Skipped duplicate pages for this subject & class: ${dupes.join(', ')}`,
          });
        }
      }

      // Extract and save document content without generating questions
      const { error: processError } = await supabase.functions.invoke('process-document', {
        body: { 
          documentId: documentData.id,
          onlyExtract: true // Flag to only extract content, not generate questions
        }
      });

      if (processError) {
        console.warn('Content extraction failed, but document was uploaded:', processError);
      }

      toast({
        title: "Document uploaded successfully",
        description: "Your document has been stored and content extracted.",
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
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="file">PDF Document</Label>
          <div className="mt-1">
            <Input
              id="file"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>
          {file && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {file.name}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="title">Document Title</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter document title"
              className="flex-1"
            />
            {originalFileName && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleTitleEdit}
                title="Edit title manually"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <CustomSubjectInput
          subjects={subjects}
          value={subject}
          onChange={setSubject}
          onSubjectsUpdate={fetchSubjects}
        />

        <div>
          <Label htmlFor="class">Class Level</Label>
          <Select value={classLevel} onValueChange={setClassLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  Class {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Pages for this Subject & Class</Label>
          <div className="mt-2">
            <PaginatedPageMultiSelect
              label="Select Pages"
              availablePages={availablePages}
              selectedPages={selectedPages}
              onChange={setSelectedPages}
              disabled={!file || loadingPages || availablePages.length === 0}
              className="w-full"
            />
            {loadingPages && (
              <div className="text-xs text-muted-foreground mt-1">Reading PDF pages...</div>
            )}
            {!loadingPages && file && availablePages.length === 0 && (
              <div className="text-xs text-muted-foreground mt-1">No pages detected yet.</div>
            )}
          </div>
        </div>
 
        <Button 
          onClick={handleUpload} 
          disabled={!file || !title || !subject || !classLevel || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Document'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
