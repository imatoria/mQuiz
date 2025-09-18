import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DocumentUpload } from './DocumentUpload';
import { DocumentProcessingStatus } from './DocumentProcessingStatus';
import { QuestionPaperGenerator } from './QuestionPaperGenerator';

import { ChildrenManagement } from './ChildrenManagement';
import { AIProviderSettings } from './AIProviderSettings';
import { AIQuestionGenerator } from './AIQuestionGenerator';
import QuestionBank from './QuestionBank';
import QuestionAnalytics from './QuestionAnalytics';
import BulkQuestionOperations from './BulkQuestionOperations';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MarkdownViewerModal from '@/components/ui/markdown-viewer-modal';

export const ContentCreation = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [documents, setDocuments] = useState<any[]>([]);
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [scheduledTests, setScheduledTests] = useState<any[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<{ file_path: string; title: string; content?: string } | null>(null);

  React.useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    // Fetch documents
    const { data: docsData } = await supabase
      .from('documents')
      .select(`
        *,
        subjects(name)
      `)
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    // Fetch question papers
    const { data: papersData } = await supabase
      .from('question_papers')
      .select(`
        *,
        subjects(name)
      `)
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });

    // Fetch scheduled papers (tests)
    const { data: testsData } = await supabase
      .from('question_papers')
      .select(`
        *,
        subjects(name)
      `)
      .eq('user_id', user.user.id)
      .neq('start_time', null)
      .neq('end_time', null)
      .order('created_at', { ascending: false });

    setDocuments(docsData || []);
    setQuestionPapers(papersData || []);
    setScheduledTests(testsData || []);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-warning animate-spin" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      processing: 'secondary',
      pending: 'outline'
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Content Creation</h2>
        <p className="text-muted-foreground">
          Upload pages, generate question papers, and schedule tests for your children.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="ai-generator">AI Generator</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Ops</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <DocumentUpload onDocumentUploaded={handleRefresh} />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Pages</CardTitle>
                <CardDescription>
                  Your uploaded pages and their processing status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documents.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                      onClick={async () => {
                        // Fetch all pages content for this document
                        const { data: pages } = await supabase
                          .from('document_pages')
                          .select('page_number, content')
                          .eq('document_id', doc.id)
                          .order('page_number');
                        
                        const combinedContent = pages?.map(p => p.content).join('\n\n') || '';
                        
                        setViewerDoc({ 
                          file_path: '', 
                          title: doc.title, 
                          content: combinedContent 
                        });
                        setViewerOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.subjects?.name} - Class {doc.class_level}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.processing_status)}
                        {getStatusBadge(doc.processing_status)}
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No pages uploaded yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="ai-generator" className="space-y-6">
          <AIQuestionGenerator />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <BulkQuestionOperations />
        </TabsContent>
      </Tabs>
      <MarkdownViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        content={viewerDoc?.content}
        title={viewerDoc?.title}
      />
    </div>
  );
};