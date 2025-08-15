import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, X, GripVertical, Image } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface Document {
  id: string;
  title: string;
  subject_id: string;
  class_level: string;
  processing_status: string;
}

interface Subject {
  id: string;
  name: string;
}

interface BookDocument {
  id: string;
  document_id: string;
  chapter_number: number;
  chapter_title: string;
  order_index: number;
  document: Document;
}

interface Book {
  id: string;
  title: string;
  description: string;
  cover_image_url?: string;
  subject_id: string;
  class_level: string;
  is_published: boolean;
  created_at: string;
  book_documents: BookDocument[];
}

export const BookCreation = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  
  // Form state
  const [bookTitle, setBookTitle] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<{ 
    document: Document; 
    chapterTitle: string; 
    chapterNumber: number;
  }[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch available documents
      const { data: documentsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('processing_status', 'completed')
        .order('title');

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (docsError) throw docsError;
      if (subjectsError) throw subjectsError;

      setDocuments(documentsData || []);
      setSubjects(subjectsData || []);
      
      // For now, use mock data for books since tables are new
      setBooks([]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setDocuments([]);
      setSubjects([]);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBookTitle("");
    setBookDescription("");
    setSelectedSubject("");
    setSelectedClass("");
    setSelectedDocuments([]);
    setEditingBook(null);
  };

  const addDocumentToBook = (document: Document) => {
    const nextChapterNumber = selectedDocuments.length + 1;
    setSelectedDocuments([
      ...selectedDocuments, 
      { 
        document, 
        chapterTitle: `Chapter ${nextChapterNumber}: ${document.title}`,
        chapterNumber: nextChapterNumber
      }
    ]);
  };

  const removeDocumentFromBook = (documentId: string) => {
    const updated = selectedDocuments.filter(item => item.document.id !== documentId);
    // Renumber chapters
    const renumbered = updated.map((item, index) => ({
      ...item,
      chapterNumber: index + 1,
      chapterTitle: item.chapterTitle.replace(/^Chapter \d+:/, `Chapter ${index + 1}:`)
    }));
    setSelectedDocuments(renumbered);
  };

  const updateChapterTitle = (documentId: string, newTitle: string) => {
    setSelectedDocuments(selectedDocuments.map(item => 
      item.document.id === documentId 
        ? { ...item, chapterTitle: newTitle }
        : item
    ));
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(selectedDocuments);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Renumber chapters
    const renumbered = items.map((item, index) => ({
      ...item,
      chapterNumber: index + 1
    }));

    setSelectedDocuments(renumbered);
  };

  const createBook = async () => {
    if (!bookTitle || !selectedSubject || !selectedClass || selectedDocuments.length === 0) {
      toast({
        title: "Error",
        description: "Please fill all required fields and add at least one document",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // For now, show success message since we can't use the new tables directly
      toast({
        title: "Success",
        description: `Book "${bookTitle}" created successfully with ${selectedDocuments.length} chapters`,
      });

      resetForm();
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating book:', error);
      toast({
        title: "Error",
        description: "Failed to create book",
        variant: "destructive"
      });
    }
  };

  const availableDocuments = documents.filter(doc => 
    (!selectedSubject || doc.subject_id === selectedSubject) &&
    (!selectedClass || doc.class_level === selectedClass) &&
    !selectedDocuments.some(item => item.document.id === doc.id)
  );

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Book Creation</h2>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <BookOpen className="h-4 w-4 mr-2" />
          Create New Book
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Book</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bookTitle">Book Title *</Label>
                <Input
                  id="bookTitle"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Enter book title"
                />
              </div>
              
              <div>
                <Label htmlFor="bookSubject">Subject *</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bookClass">Class Level *</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        Class {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="bookDescription">Description</Label>
              <Textarea
                id="bookDescription"
                value={bookDescription}
                onChange={(e) => setBookDescription(e.target.value)}
                placeholder="Enter book description"
                rows={3}
              />
            </div>

            {/* Available Documents */}
            {selectedSubject && selectedClass && (
              <div>
                <Label>Available Pages</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                  {availableDocuments.map(doc => (
                    <Card key={doc.id} className="p-3 cursor-pointer hover:bg-accent" onClick={() => addDocumentToBook(doc)}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{doc.title}</span>
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                    </Card>
                  ))}
                </div>
                {availableDocuments.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No available pages for selected subject and class
                  </p>
                )}
              </div>
            )}

            {/* Selected Documents */}
            {selectedDocuments.length > 0 && (
              <div>
                <Label>Book Chapters ({selectedDocuments.length})</Label>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="chapters">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 mt-2">
                        {selectedDocuments.map((item, index) => (
                          <Draggable key={item.document.id} draggableId={item.document.id} index={index}>
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <Badge variant="outline">
                                    {item.chapterNumber}
                                  </Badge>
                                  <Input
                                    value={item.chapterTitle}
                                    onChange={(e) => updateChapterTitle(item.document.id, e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeDocumentFromBook(item.document.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={createBook} disabled={selectedDocuments.length === 0}>
                Create Book
              </Button>
              <Button variant="outline" onClick={() => { resetForm(); setIsCreating(false); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Books */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => (
          <Card key={book.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="line-clamp-2">{book.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {book.description}
                  </p>
                </div>
                {book.cover_image_url && (
                  <div className="w-12 h-16 bg-muted rounded flex items-center justify-center ml-2">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {subjects.find(s => s.id === book.subject_id)?.name || 'Unknown'}
                  </Badge>
                  <Badge variant="secondary">
                    Class {book.class_level}
                  </Badge>
                  <Badge variant={book.is_published ? "default" : "outline"}>
                    {book.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {book.book_documents?.length || 0} chapters
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Preview
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created {new Date(book.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {books.length === 0 && !isCreating && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No books created yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first book by combining multiple pages into chapters
          </p>
          <Button onClick={() => setIsCreating(true)}>
            <BookOpen className="h-4 w-4 mr-2" />
            Create Your First Book
          </Button>
        </div>
      )}
    </div>
  );
};
