import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  BookOpen, 
  FileText, 
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  subject_id: string;
  class_level: string;
  processing_status: string | null;
  created_at: string;
  subjects?: { name: string };
}

interface BookManagementProps {
  onBooksUpdate?: () => void;
}

export const BookManagement = ({ onBooksUpdate }: BookManagementProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      // Fetch documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select(`
          *,
          subjects(name)
        `)
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      setSubjects(subjectsData || []);
      setDocuments(documentsData || []);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getFilteredDocuments = () => {
    return documents.filter(doc => {
      if (selectedSubject && doc.subject_id !== selectedSubject) return false;
      if (selectedClass && doc.class_level !== selectedClass) return false;
      return true;
    });
  };

  const getDocumentsBySubjectAndClass = () => {
    const grouped: Record<string, Record<string, Document[]>> = {};
    
    documents.forEach(doc => {
      const subject = doc.subjects?.name || 'Unknown Subject';
      const classLevel = `Class ${doc.class_level}`;
      
      if (!grouped[subject]) {
        grouped[subject] = {};
      }
      if (!grouped[subject][classLevel]) {
        grouped[subject][classLevel] = [];
      }
      
      grouped[subject][classLevel].push(doc);
    });
    
    return grouped;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading documents...</div>
        </CardContent>
      </Card>
    );
  }

  const groupedDocuments = getDocumentsBySubjectAndClass();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Document Library
              </CardTitle>
              <CardDescription>
                Organize and manage your educational documents by subject and class
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="subjectFilter">Filter by Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label htmlFor="classFilter">Filter by Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      Class {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents uploaded yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first document to start organizing your educational content.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Show filtered view if filters are applied */}
              {(selectedSubject || selectedClass) ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Filtered Documents ({getFilteredDocuments().length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getFilteredDocuments().map((doc) => (
                      <Card key={doc.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{doc.title}</CardTitle>
                              <CardDescription className="mt-1">
                                {doc.subjects?.name} • Class {doc.class_level}
                              </CardDescription>
                            </div>
                            {getStatusIcon(doc.processing_status)}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            {getStatusBadge(doc.processing_status)}
                            <span className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                /* Show grouped view by default */
                Object.entries(groupedDocuments).map(([subject, classes]) => (
                  <div key={subject} className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">{subject}</h3>
                    {Object.entries(classes).map(([classLevel, docs]) => (
                      <div key={classLevel} className="ml-4">
                        <h4 className="text-md font-medium text-muted-foreground mb-3">{classLevel}</h4>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {docs.map((doc) => (
                            <Card key={doc.id} className="hover:shadow-md transition-shadow">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <CardTitle className="text-lg">{doc.title}</CardTitle>
                                    <CardDescription className="mt-1">
                                      Added {new Date(doc.created_at).toLocaleDateString()}
                                    </CardDescription>
                                  </div>
                                  {getStatusIcon(doc.processing_status)}
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="flex items-center justify-between">
                                  {getStatusBadge(doc.processing_status)}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};