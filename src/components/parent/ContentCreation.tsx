import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DocumentUpload } from './DocumentUpload';
import { DocumentProcessingStatus } from './DocumentProcessingStatus';
import { QuestionPaperGenerator } from './QuestionPaperGenerator';
import { TestScheduler } from './TestScheduler';
import { ChildrenManagement } from './ChildrenManagement';
import { BookManagement } from './BookManagement';
import { AIProviderSettings } from './AIProviderSettings';
import { AIQuestionGenerator } from './AIQuestionGenerator';
import QuestionBank from './QuestionBank';
import QuestionAnalytics from './QuestionAnalytics';
import BulkQuestionOperations from './BulkQuestionOperations';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const ContentCreation = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [documents, setDocuments] = useState<any[]>([]);
  const [questionPapers, setQuestionPapers] = useState<any[]>([]);
  const [scheduledTests, setScheduledTests] = useState<any[]>([]);

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

    // Fetch scheduled tests
    const { data: testsData } = await supabase
      .from('scheduled_tests')
      .select(`
        *,
        question_papers(title, subjects(name))
      `)
      .eq('creator_id', user.user.id)
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
          Upload documents, generate question papers, and schedule tests for your children.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="generate">Papers</TabsTrigger>
          <TabsTrigger value="ai-generator">AI Generator</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Ops</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <DocumentUpload onDocumentUploaded={handleRefresh} />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>
                  Your uploaded documents and their processing status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documents.slice(0, 5).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                      No documents uploaded yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="books" className="space-y-6">
          <BookManagement onBooksUpdate={handleRefresh} />
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <QuestionPaperGenerator onPaperGenerated={handleRefresh} />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Question Papers</CardTitle>
                <CardDescription>
                  Your generated question papers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {questionPapers.slice(0, 5).map((paper) => (
                    <div key={paper.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{paper.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {paper.subjects?.name} - Class {paper.class_level} • {paper.total_questions} questions • {paper.time_limit_minutes} mins
                        </p>
                      </div>
                      <Badge variant="outline">Ready</Badge>
                    </div>
                  ))}
                  {questionPapers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No question papers generated yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <TestScheduler onTestScheduled={handleRefresh} />
            
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Tests</CardTitle>
                <CardDescription>
                  Your upcoming and past tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduledTests.slice(0, 5).map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{test.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {test.question_papers?.subjects?.name} • {new Date(test.start_time).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={new Date(test.end_time) > new Date() ? "default" : "secondary"}>
                        {new Date(test.end_time) > new Date() ? "Active" : "Completed"}
                      </Badge>
                    </div>
                  ))}
                  {scheduledTests.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tests scheduled yet
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
    </div>
  );
};