import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocumentUpload } from './DocumentUpload';
import { DocumentProcessingStatus } from './DocumentProcessingStatus';
import { QuestionPaperGenerator } from './QuestionPaperGenerator';
import { BookManager } from './BookManager';

import { ChildrenManagement } from './ChildrenManagement';
import { AIProviderSettings } from './AIProviderSettings';
import { AIQuestionGenerator } from './AIQuestionGenerator';
import QuestionBank from './QuestionBank';
import QuestionAnalytics from './QuestionAnalytics';
import BulkQuestionOperations from './BulkQuestionOperations';
import { Book } from 'lucide-react';

export const ContentCreation = () => {
  const { tab, subtab } = useParams();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  // Read subtab from URL or default to 'upload'
  const activeTab = subtab || 'upload';

  // Redirect to default subtab if not set
  useEffect(() => {
    if (tab === 'content' && !subtab) {
      navigate('/parent/content/upload', { replace: true });
    }
  }, [tab, subtab, navigate]);

  const handleSubTabChange = (value: string) => {
    navigate(`/parent/content/${value}`);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Content Creation</h2>
        <p className="text-muted-foreground">
          Upload pages, generate question papers, and schedule tests for your children.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleSubTabChange} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="book">
            <Book className="h-4 w-4 mr-2" />
            Book
          </TabsTrigger>
          <TabsTrigger value="ai-generator">AI Generator</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Ops</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <DocumentUpload onDocumentUploaded={handleRefresh} />
        </TabsContent>

        <TabsContent value="book" className="space-y-6">
          <BookManager />
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