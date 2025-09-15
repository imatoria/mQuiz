import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  Settings,
  Zap,
  Download
} from 'lucide-react';

interface ProcessingDocument {
  id: string;
  title: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  error_message?: string;
  questions_count?: number;
}

interface DocumentProcessingStatusProps {
  onRetryDocument?: (documentId: string) => void;
}

export const DocumentProcessingStatus = ({ onRetryDocument }: DocumentProcessingStatusProps) => {
  const [documents, setDocuments] = useState<ProcessingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingDocuments, setProcessingDocuments] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchProcessingDocuments();
    
    // Set up real-time updates
    const channel = supabase
      .channel('document-processing')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'documents'
      }, (payload) => {
        fetchProcessingDocuments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProcessingDocuments = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          processing_status,
          created_at,
          questions (count)
        `)
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const documentsWithCounts = data?.map(doc => ({
        ...doc,
        processing_status: doc.processing_status as 'pending' | 'processing' | 'completed' | 'failed',
        questions_count: Array.isArray(doc.questions) ? doc.questions.length : 0
      })) || [];

      setDocuments(documentsWithCounts);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pages status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryProcessing = async (documentId: string) => {
    if (processingDocuments.has(documentId)) return;

    setProcessingDocuments(prev => new Set(prev).add(documentId));

    try {
      // Update status to processing
      await supabase
        .from('documents')
        .update({ processing_status: 'processing' })
        .eq('id', documentId);

      // Note: Questions are no longer directly linked to documents

      // Call the process document function
      const { error } = await supabase.functions.invoke('process-document', {
        body: { documentId }
      });

      if (error) throw error;

      toast({
        title: "Processing Started",
        description: "Pages processing has been restarted. Please wait...",
      });

      // Trigger callback if provided
      onRetryDocument?.(documentId);
      
      // Refresh the list
      fetchProcessingDocuments();

    } catch (error: any) {
      console.error('Error retrying document processing:', error);
      toast({
        title: "Retry Failed",
        description: error.message || "Failed to retry pages processing",
        variant: "destructive"
      });
    } finally {
      setProcessingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getProgressValue = (status: string) => {
    switch (status) {
      case 'completed':
        return 100;
      case 'processing':
        return 50;
      case 'failed':
        return 0;
      default:
        return 10;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading pages status...</div>
        </CardContent>
      </Card>
    );
  }

  const pendingDocs = documents.filter(d => d.processing_status === 'pending');
  const processingDocs = documents.filter(d => d.processing_status === 'processing');
  const failedDocs = documents.filter(d => d.processing_status === 'failed');
  const completedDocs = documents.filter(d => d.processing_status === 'completed');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{pendingDocs.length}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{processingDocs.length}</div>
                <div className="text-sm text-muted-foreground">Processing</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{completedDocs.length}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{failedDocs.length}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Documents Alert */}
      {failedDocs.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {failedDocs.length} page{failedDocs.length > 1 ? 's' : ''} failed to process. 
            Make sure your AI provider API keys are configured in settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Document Processing List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Pages Processing Status
          </CardTitle>
          <CardDescription>
            Monitor your pages processing progress and retry failed processes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pages</h3>
              <p className="text-muted-foreground">
                Upload pages to start generating questions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => (
                <Card key={document.id} className="border">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(document.processing_status)}
                          <div>
                            <h4 className="font-medium">{document.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Created {new Date(document.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(document.processing_status)}>
                            {document.processing_status}
                          </Badge>
                          
                          {document.processing_status === 'completed' && (
                            <Badge variant="outline">
                              {document.questions_count} questions
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Progress 
                        value={getProgressValue(document.processing_status)} 
                        className="h-2"
                      />

                      {document.processing_status === 'failed' && (
                        <div className="flex items-center justify-between pt-2">
                          <Alert className="flex-1 mr-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              Processing failed. Check your AI provider settings and try again.
                            </AlertDescription>
                          </Alert>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryProcessing(document.id)}
                            disabled={processingDocuments.has(document.id)}
                          >
                            {processingDocuments.has(document.id) ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Retrying...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Retry
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};