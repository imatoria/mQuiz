import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  ArrowUp, 
  ArrowDown,
  GripVertical,
  Settings
} from 'lucide-react';

interface Book {
  id: string;
  title: string;
  description: string | null;
  subject_id: string;
  class_level: string;
  created_at: string;
  subjects?: { name: string };
}

interface Document {
  id: string;
  title: string;
  book_id: string | null;
  document_order: number | null;
  processing_status: string | null;
  subjects?: { name: string };
}

interface BookManagementProps {
  onBooksUpdate?: () => void;
}

export const BookManagement = ({ onBooksUpdate }: BookManagementProps) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBook, setIsCreatingBook] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  
  // Form states
  const [bookTitle, setBookTitle] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [bookSubject, setBookSubject] = useState('');
  const [bookClassLevel, setBookClassLevel] = useState('');
  
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

      // Fetch books
      const { data: booksData } = await supabase
        .from('books')
        .select(`
          *,
          subjects(name)
        `)
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      // Fetch documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          book_id,
          document_order,
          processing_status,
          subjects(name)
        `)
        .eq('user_id', user.user.id)
        .order('document_order', { ascending: true });

      setSubjects(subjectsData || []);
      setBooks(booksData || []);
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

  const handleCreateBook = async () => {
    if (!bookTitle || !bookSubject || !bookClassLevel) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingBook(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('books')
        .insert({
          user_id: user.user.id,
          title: bookTitle,
          description: bookDescription || null,
          subject_id: bookSubject,
          class_level: bookClassLevel as any
        });

      if (error) throw error;

      toast({
        title: "Book created successfully",
        description: `"${bookTitle}" has been created.`,
      });

      // Reset form
      setBookTitle('');
      setBookDescription('');
      setBookSubject('');
      setBookClassLevel('');
      setIsDialogOpen(false);
      
      fetchData();
      onBooksUpdate?.();

    } catch (error: any) {
      toast({
        title: "Failed to create book",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingBook(false);
    }
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${bookTitle}"? This will remove all documents from this book but won't delete the documents themselves.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;

      toast({
        title: "Book deleted",
        description: `"${bookTitle}" has been deleted.`,
      });

      fetchData();
      onBooksUpdate?.();

    } catch (error: any) {
      toast({
        title: "Failed to delete book",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleManageDocuments = (book: Book) => {
    setSelectedBook(book);
    setIsManageDialogOpen(true);
  };

  const handleAddDocumentToBook = async (documentId: string) => {
    if (!selectedBook) return;

    try {
      // Get the highest order number for this book
      const bookDocuments = documents.filter(doc => doc.book_id === selectedBook.id);
      const maxOrder = Math.max(...bookDocuments.map(doc => doc.document_order || 0), 0);

      const { error } = await supabase
        .from('documents')
        .update({
          book_id: selectedBook.id,
          document_order: maxOrder + 1
        })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document added to book",
        description: "Document has been added to the book.",
      });

      fetchData();

    } catch (error: any) {
      toast({
        title: "Failed to add document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveDocumentFromBook = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          book_id: null,
          document_order: null
        })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: "Document removed from book",
        description: "Document has been removed from the book.",
      });

      fetchData();

    } catch (error: any) {
      toast({
        title: "Failed to remove document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMoveDocument = async (documentId: string, direction: 'up' | 'down') => {
    if (!selectedBook) return;

    try {
      const bookDocuments = documents
        .filter(doc => doc.book_id === selectedBook.id)
        .sort((a, b) => (a.document_order || 0) - (b.document_order || 0));

      const currentIndex = bookDocuments.findIndex(doc => doc.id === documentId);
      if (currentIndex === -1) return;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= bookDocuments.length) return;

      // Swap the order values
      const currentDoc = bookDocuments[currentIndex];
      const targetDoc = bookDocuments[targetIndex];

      const { error } = await supabase
        .from('documents')
        .update({ document_order: targetDoc.document_order })
        .eq('id', currentDoc.id);

      if (error) throw error;

      const { error: error2 } = await supabase
        .from('documents')
        .update({ document_order: currentDoc.document_order })
        .eq('id', targetDoc.id);

      if (error2) throw error2;

      fetchData();

    } catch (error: any) {
      toast({
        title: "Failed to move document",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getBookDocuments = (bookId: string) => {
    return documents
      .filter(doc => doc.book_id === bookId)
      .sort((a, b) => (a.document_order || 0) - (b.document_order || 0));
  };

  const getUnassignedDocuments = () => {
    return documents.filter(doc => !doc.book_id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading books...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Book Management
              </CardTitle>
              <CardDescription>
                Organize your documents into books and manage their order
              </CardDescription>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Book
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Book</DialogTitle>
                  <DialogDescription>
                    Create a book to organize your documents by subject and class.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bookTitle">Book Title</Label>
                    <Input
                      id="bookTitle"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      placeholder="Enter book title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bookDescription">Description (Optional)</Label>
                    <Textarea
                      id="bookDescription"
                      value={bookDescription}
                      onChange={(e) => setBookDescription(e.target.value)}
                      placeholder="Enter book description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bookSubject">Subject</Label>
                      <Select value={bookSubject} onValueChange={setBookSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="bookClass">Class Level</Label>
                      <Select value={bookClassLevel} onValueChange={setBookClassLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((level) => (
                            <SelectItem key={level} value={level.toString()}>
                              Class {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleCreateBook} 
                      disabled={isCreatingBook || !bookTitle || !bookSubject || !bookClassLevel}
                      className="flex-1"
                    >
                      {isCreatingBook ? 'Creating...' : 'Create Book'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {books.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No books created yet</h3>
              <p className="text-muted-foreground mb-4">
                Create books to organize your documents by subject and class.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => {
                const bookDocuments = getBookDocuments(book.id);
                return (
                  <Card key={book.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{book.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {book.subjects?.name} • Class {book.class_level}
                          </CardDescription>
                          {book.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {book.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBook(book.id, book.title)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          <FileText className="w-3 h-3 mr-1" />
                          {bookDocuments.length} documents
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageDocuments(book)}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Management Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Documents - {selectedBook?.title}</DialogTitle>
            <DialogDescription>
              Add documents to this book and arrange their order.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Book Documents */}
            <div>
              <h3 className="font-medium mb-3">Documents in Book</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedBook && getBookDocuments(selectedBook.id).map((doc, index) => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 border rounded">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">Order: {index + 1}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDocument(doc.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDocument(doc.id, 'down')}
                        disabled={selectedBook && index === getBookDocuments(selectedBook.id).length - 1}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDocumentFromBook(doc.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {selectedBook && getBookDocuments(selectedBook.id).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents in this book yet
                  </p>
                )}
              </div>
            </div>

            {/* Available Documents */}
            <div>
              <h3 className="font-medium mb-3">Available Documents</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {getUnassignedDocuments().map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 border rounded">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.subjects?.name}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddDocumentToBook(doc.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
                {getUnassignedDocuments().length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All documents are assigned to books
                  </p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
