import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { Search, Filter, Share2, FileText, BookOpen, Clock, FileDown, Eye } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationInfo } from "@/components/ui/pagination";

interface Document {
  id: string;
  title: string;
  subject_id: string;
  class_level: string;
  processing_status: string;
  created_at: string;
  current_version?: number;
}

interface Subject {
  id: string;
  name: string;
}

export const DocumentLibrary = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [pageSelections, setPageSelections] = useState<Record<string, number[]>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch documents
      const { data: documentsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) throw subjectsError;

      setDocuments(documentsData || []);
      setSubjects(subjectsData || []);

      // Fetch selected pages per document (ordered desc)
      const docIds = (documentsData || []).map((d: any) => d.id);
      if (docIds.length > 0) {
        const { data: selections } = await supabase
          .from('document_page_selections')
          .select('document_id, page_number')
          .in('document_id', docIds)
          .order('page_number', { ascending: false });
        const map: Record<string, number[]> = {};
        (selections || []).forEach((row: any) => {
          if (!map[row.document_id]) map[row.document_id] = [];
          map[row.document_id].push(row.page_number);
        });
        setPageSelections(map);
      } else {
        setPageSelections({});
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown Subject';
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Eye className="h-3 w-3" />;
      case 'processing':
        return <Clock className="h-3 w-3" />;
      default:
        return <FileDown className="h-3 w-3" />;
    }
  };

  const handleRegenerateQuestions = async (documentId: string) => {
    try {
      // Update status to processing
      await supabase
        .from('documents')
        .update({ processing_status: 'processing' })
        .eq('id', documentId);

      // Delete existing questions for this document
      await supabase
        .from('questions')
        .delete()
        .eq('document_id', documentId);

      // Call the process document function
      const { error } = await supabase.functions.invoke('process-document', {
        body: { documentId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Questions are being regenerated for this document.",
      });

      // Refresh the documents list
      fetchData();

    } catch (error) {
      console.error('Error regenerating questions:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate questions. Please try again.",
        variant: "destructive"
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !selectedSubject || selectedSubject === 'all' || doc.subject_id === selectedSubject;
    const matchesClass = !selectedClass || selectedClass === 'all' || doc.class_level === selectedClass;
    const matchesStatus = !selectedStatus || selectedStatus === 'all' || doc.processing_status === selectedStatus;

    return matchesSearch && matchesSubject && matchesClass && matchesStatus;
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedDocuments,
    goToPage,
    nextPage,
    previousPage,
    canGoNext,
    canGoPrevious,
    startItem,
    endItem,
    totalItems,
  } = usePagination({
    data: filteredDocuments,
    itemsPerPage: 12,
  });

  // Group paginated documents by subject and class
  const groupedDocuments = paginatedDocuments.reduce((acc, doc) => {
    const subjectName = getSubjectName(doc.subject_id);
    const key = `${subjectName} - Class ${doc.class_level}`;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Document Library</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            {documents.length} documents
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  Class {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">
                {documents.filter(d => d.processing_status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-secondary">
                {documents.filter(d => d.processing_status === 'processing').length}
              </div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-muted-foreground">
                {documents.filter(d => d.processing_status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-destructive">
                {documents.filter(d => d.processing_status === 'failed').length}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredDocuments.length > 0 && (
        <div className="flex items-center justify-between">
          <PaginationInfo startItem={startItem} endItem={endItem} totalItems={totalItems} />
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      previousPage();
                    }}
                    className={!canGoPrevious ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(pageNumber);
                        }}
                        isActive={currentPage === pageNumber}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(totalPages);
                        }}
                        className="cursor-pointer"
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      nextPage();
                    }}
                    className={!canGoNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {/* Grouped Documents */}
      <div className="space-y-6">
        {Object.entries(groupedDocuments).map(([groupKey, docs]) => (
          <div key={groupKey} className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              {groupKey} ({docs.length} documents)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map(document => (
                <Card key={document.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base line-clamp-2 flex-1">
                        {document.title}
                      </CardTitle>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          v{document.current_version || 1}
                        </div>
                        <Badge variant={getStatusVariant(document.processing_status)} className="text-xs">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(document.processing_status)}
                            {document.processing_status}
                          </div>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          disabled={document.processing_status !== 'completed'}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          disabled={document.processing_status !== 'completed'}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Add to Book
                        </Button>
                        {document.processing_status === 'failed' ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRegenerateQuestions(document.id)}
                            className="flex-1"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Retry
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Created {new Date(document.created_at).toLocaleDateString()}
                      </div>
                      {pageSelections[document.id]?.length ? (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Pages:</span> {pageSelections[document.id].join(', ')}
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedSubject || selectedClass || selectedStatus
              ? "Try adjusting your filters" 
              : "Upload your first document to get started"}
          </p>
        </div>
      )}
    </div>
  );
};