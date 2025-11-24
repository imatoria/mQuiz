import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X, 
  AlertTriangle,
  FileText,
  Clock,
  User,
  MessageSquare
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  file_path: string;
  processing_status: string;
  created_at: string;
  user_id: string;
  total_pages: number | null;
  class_parent_id: string | null;
  subject_parent_id: string | null;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
  classes_parent?: {
    class_name: string;
  } | null;
  subjects_parent?: {
    subject_name: string;
  } | null;
}

interface QuestionPaper {
  id: string;
  title: string;
  total_questions: number;
  created_at: string;
  user_id: string;
  subject_parent_id: string | null;
  class_parent_id: string | null;
  time_limit_minutes: number;
  difficulty_filter: string[] | null;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
  classes_parent?: {
    class_name: string;
  } | null;
  subjects_parent?: {
    subject_name: string;
  } | null;
}

export const ContentModeration = () => {
  const { subtab } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContent, setSelectedContent] = useState<Document | QuestionPaper | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const { toast } = useToast();

  // Read moderation subtab from URL or default to 'documents'
  const activeTab = (subtab as 'documents' | 'questions') || 'documents';

  // Redirect to default subtab if not set and we're on the moderation tab
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (!subtab && currentPath.startsWith('/admin/moderation')) {
      navigate('/admin/moderation/documents', { replace: true });
    }
  }, [subtab, navigate]);

  // Update URL when changing moderation tabs
  const handleModerationTabChange = (value: string) => {
    navigate(`/admin/moderation/${value}`);
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // Fetch documents with user profiles and class/subject info
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select(`
          *,
          profiles(full_name, email),
          classes_parent(class_name),
          subjects_parent(subject_name)
        `)
        .order('created_at', { ascending: false });

      if (documentsError) throw documentsError;

      // Fetch question papers with user profiles and class/subject info
      const { data: questionPapersData, error: questionPapersError } = await supabase
        .from('question_papers')
        .select(`
          *,
          profiles(full_name, email),
          classes_parent(class_name),
          subjects_parent(subject_name)
        `)
        .order('created_at', { ascending: false });

      if (questionPapersError) throw questionPapersError;

      setDocuments((documentsData as any) || []);
      setQuestionPapers((questionPapersData as any) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching content",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateDocumentStatus = async (documentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ processing_status: status })
        .eq('id', documentId);

      if (error) throw error;

      setDocuments(documents.map(doc => 
        doc.id === documentId ? { ...doc, processing_status: status } : doc
      ));

      toast({
        title: "Pages status updated",
        description: `Pages have been ${status}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating pages status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'failed':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.processing_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredQuestionPapers = questionPapers.filter(qp => {
    const matchesSearch = qp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         qp.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading content...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Content Moderation
          </CardTitle>
          <CardDescription>
            Review and moderate user-generated content including pages and question papers
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Tabs with Filters */}
      <Tabs value={activeTab} onValueChange={handleModerationTabChange}>
        <TabsList>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Pages ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Question Papers ({questionPapers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search pages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Approved</SelectItem>
                    <SelectItem value="failed">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium">{document.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {document.total_pages} pages • {document.classes_parent?.class_name || 'No class'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{document.profiles?.full_name || 'Unknown'}</div>
                              <div className="text-sm text-muted-foreground">{document.profiles?.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(document.processing_status)}
                        </TableCell>
                        <TableCell>
                          {new Date(document.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Review Pages</DialogTitle>
                                  <DialogDescription>
                                    Review and moderate these pages
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Pages Details</h4>
                                    <div className="text-sm space-y-1">
                                      <p><strong>Title:</strong> {document.title}</p>
                                      <p><strong>Pages:</strong> {document.total_pages}</p>
                                      <p><strong>Class:</strong> {document.classes_parent?.class_name || 'No class'}</p>
                                      <p><strong>Subject:</strong> {document.subjects_parent?.subject_name || 'No subject'}</p>
                                      <p><strong>Creator:</strong> {document.profiles?.full_name} ({document.profiles?.email})</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">Moderation Notes</h4>
                                    <Textarea
                                      placeholder="Add moderation notes..."
                                      value={moderationNotes}
                                      onChange={(e) => setModerationNotes(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      onClick={() => updateDocumentStatus(document.id, 'completed')}
                                      className="flex-1"
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => updateDocumentStatus(document.id, 'failed')}
                                      className="flex-1"
                                    >
                                      <X className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredDocuments.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pages found</h3>
                  <p className="text-muted-foreground">
                    No pages match your current filters.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search question papers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestionPapers.map((questionPaper) => (
                      <TableRow key={questionPaper.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-secondary/10 rounded-lg">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium">{questionPaper.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {questionPaper.total_questions} questions
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{questionPaper.profiles?.full_name || 'Unknown'}</div>
                              <div className="text-sm text-muted-foreground">{questionPaper.profiles?.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(questionPaper.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredQuestionPapers.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No question papers found</h3>
                  <p className="text-muted-foreground">
                    No question papers match your current filters.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};