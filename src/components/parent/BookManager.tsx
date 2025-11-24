import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClassesParent } from '@/hooks/useClassesParent';
import { useSubjectsParent } from '@/hooks/useSubjectsParent';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FolderOpen, BookOpen, FileText, Edit2, Save, X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DocumentPage {
  id: string;
  document_id: string;
  page_number: number;
  content: string | null;
  created_at: string;
  updated_at: string;
}

interface SubjectWithPages {
  subjectId: string;
  subjectName: string;
  pages: DocumentPage[];
  totalPages: number;
}

interface GroupedBooks {
  [classId: string]: {
    className: string;
    classId: string;
    subjects: SubjectWithPages[];
  };
}

export function BookManager() {
  const { classes, isLoading: classesLoading } = useClassesParent();
  const { subjects, isLoading: subjectsLoading } = useSubjectsParent();
  const [groupedBooks, setGroupedBooks] = useState<GroupedBooks>({});
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [editingPage, setEditingPage] = useState<DocumentPage | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!classesLoading && !subjectsLoading) {
      fetchBooksData();
    }
  }, [classesLoading, subjectsLoading, classes, subjects]);

  const fetchBooksData = async () => {
    try {
      setIsLoadingPages(true);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch all documents with their pages
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('id, class_parent_id, subject_parent_id')
        .eq('user_id', user.user.id);

      if (docsError) throw docsError;

      // Fetch all pages for these documents
      const documentIds = documents?.map(d => d.id) || [];
      const { data: pages, error: pagesError } = await supabase
        .from('document_pages')
        .select('*')
        .in('document_id', documentIds)
        .order('page_number');

      if (pagesError) throw pagesError;

      // Group pages by class and subject
      const grouped: GroupedBooks = {};

      classes.forEach(cls => {
        grouped[cls.id] = {
          className: cls.class_name,
          classId: cls.id,
          subjects: []
        };
      });

      subjects.forEach(subject => {
        // Find all documents for this subject
        const subjectDocs = documents?.filter(d => d.subject_parent_id === subject.id) || [];
        const subjectDocIds = subjectDocs.map(d => d.id);
        
        // Find all pages for these documents
        const subjectPages = pages?.filter(p => subjectDocIds.includes(p.document_id)) || [];

        if (subjectPages.length > 0) {
          // Get the class for this subject (from first document)
          const classId = subjectDocs[0]?.class_parent_id;
          if (classId && grouped[classId]) {
            grouped[classId].subjects.push({
              subjectId: subject.id,
              subjectName: subject.subject_name,
              pages: subjectPages,
              totalPages: subjectPages.length
            });
          }
        }
      });

      setGroupedBooks(grouped);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handleEditPage = (page: DocumentPage) => {
    setEditingPage(page);
    setEditedContent(page.content || '');
  };

  const handleSavePage = async () => {
    if (!editingPage) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('document_pages')
        .update({ 
          content: editedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPage.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Page content updated successfully'
      });

      // Refresh data
      await fetchBooksData();
      setEditingPage(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save page content',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePage = async () => {
    if (!deletingPageId) return;

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from('document_pages')
        .delete()
        .eq('id', deletingPageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Page deleted successfully'
      });

      // Refresh data
      await fetchBooksData();
      setDeletingPageId(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete page',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = classesLoading || subjectsLoading || isLoadingPages;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const classesWithBooks = Object.values(groupedBooks).filter(cls => cls.subjects.length > 0);

  if (classesWithBooks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Books Available</h3>
        <p className="text-muted-foreground">
          Upload documents to create subject books with pages
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Accordion type="multiple" className="space-y-4">
          {classesWithBooks.map(classData => (
            <AccordionItem key={classData.classId} value={classData.classId} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{classData.className}</span>
                  <span className="text-sm text-muted-foreground">
                    ({classData.subjects.length} {classData.subjects.length === 1 ? 'subject' : 'subjects'})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <Accordion type="multiple" className="space-y-2 mt-2">
                  {classData.subjects.map(subject => (
                    <AccordionItem 
                      key={subject.subjectId} 
                      value={subject.subjectId}
                      className="border rounded-md"
                    >
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span className="font-medium">{subject.subjectName}</span>
                          <span className="text-sm text-muted-foreground">
                            ({subject.totalPages} {subject.totalPages === 1 ? 'page' : 'pages'})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <ScrollArea className="h-[400px] mt-2">
                          <div className="space-y-2">
                            {subject.pages.map(page => (
                              <Card key={page.id} className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium mb-1">Page {page.page_number}</div>
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {page.content 
                                          ? page.content.substring(0, 100) + (page.content.length > 100 ? '...' : '')
                                          : 'No content'}
                                      </p>
                                      <div className="text-xs text-muted-foreground mt-2">
                                        Last updated {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditPage(page)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeletingPageId(page.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Page Editor Dialog */}
      <Dialog open={!!editingPage} onOpenChange={() => setEditingPage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Edit Page {editingPage?.page_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Enter page content..."
            />
            <div className="text-sm text-muted-foreground">
              Character count: {editedContent.length}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPage(null)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSavePage} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPageId} onOpenChange={() => setDeletingPageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePage}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
