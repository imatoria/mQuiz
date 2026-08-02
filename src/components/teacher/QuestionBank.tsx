import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";
import { Search, Edit, Trash2, Plus, Filter, BookOpen, BarChart3, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { dbService } from "@/services/db";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationInfo, PaginationFirst, PaginationLast } from "@/components/ui/pagination";
import { useStudentSubjects } from '@/hooks/useStudentSubjects';
import { useStudentClasses } from '@/hooks/useStudentClasses';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  difficulty: 'easy' | 'medium' | 'difficult';
  page_number?: number;
  subject_id: string;
  class_id: string;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
}

interface QuestionBankProps {
  onQuestionUpdate?: () => void;
}

export default function QuestionBank({ onQuestionUpdate }: QuestionBankProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Temporary filter states (not applied until Apply Filters is clicked)
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  const [tempSelectedSubject, setTempSelectedSubject] = useState<string>('all');
  const [tempSelectedDifficulty, setTempSelectedDifficulty] = useState<string>('all');
  const [tempSelectedClass, setTempSelectedClass] = useState<string>('all');
  const [tempDateRange, setTempDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Applied filter states (used for actual filtering)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Track if any filter has been applied yet
  const [hasAppliedFilter, setHasAppliedFilter] = useState(false);
  
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { toast } = useToast();

  // Use student assignments hooks
  const { uniqueSubjects, isLoading: loadingSubjects } = useStudentSubjects();
  const { uniqueClasses, isLoading: loadingClasses } = useStudentClasses();

  const difficulties = ['easy', 'medium', 'difficult'];

  useEffect(() => {
    // Only load initial data dependencies, do not auto-fetch questions yet.
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch questions directly (no longer using document relationships)
      const { data: questionsData } = await dbService.getProvider().query(
        'SELECT * FROM questions ORDER BY created_at DESC'
      );

      if (questionsData) {
        setQuestions(questionsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch questions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || question.subject_id === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || question.difficulty === selectedDifficulty;
    const matchesClass = selectedClass === 'all' || question.class_id === selectedClass;
    
    // Date range filtering
    const questionDate = new Date(question.created_at);
    const matchesDateRange = (!dateRange.from || questionDate >= dateRange.from) && 
                            (!dateRange.to || questionDate <= dateRange.to);
    
    return matchesSearch && matchesSubject && matchesDifficulty && matchesClass && matchesDateRange;
  });

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedQuestions,
    goToPage,
    nextPage,
    previousPage,
    canGoNext,
    canGoPrevious,
    startItem,
    endItem,
    totalItems,
    itemsPerPage: currentItemsPerPage,
    setItemsPerPage: updateItemsPerPage,
  } = usePagination({
    data: filteredQuestions,
    itemsPerPage: itemsPerPage,
    onItemsPerPageChange: setItemsPerPage,
  });
  
  const applyFilters = () => {
    setSearchTerm(tempSearchTerm);
    setSelectedSubject(tempSelectedSubject);
    setSelectedDifficulty(tempSelectedDifficulty);
    setSelectedClass(tempSelectedClass);
    setDateRange(tempDateRange);
    setHasAppliedFilter(true);
    fetchData();
  };
  
  const clearAllFilters = () => {
    setTempSearchTerm('');
    setTempSelectedSubject('all');
    setTempSelectedDifficulty('all');
    setTempSelectedClass('all');
    setTempDateRange({});
    setSearchTerm('');
    setSelectedSubject('all');
    setSelectedDifficulty('all');
    setSelectedClass('all');
    setDateRange({});
    setHasAppliedFilter(false);
    setQuestions([]); // Clear questions
  };

  const getDifficultyBadgeVariant = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'default';
      case 'medium': return 'secondary';
      case 'difficult': return 'destructive';
      default: return 'outline';
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setIsEditDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;

    try {
      const { error } = await dbService.getProvider().execute(`
        UPDATE questions 
        SET question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ?, difficulty = ?
        WHERE id = ?
      `, [
        editingQuestion.question_text,
        editingQuestion.option_a,
        editingQuestion.option_b,
        editingQuestion.option_c,
        editingQuestion.option_d,
        editingQuestion.correct_answer,
        editingQuestion.difficulty,
        editingQuestion.id
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question updated successfully.",
      });

      setIsEditDialogOpen(false);
      setEditingQuestion(null);
      fetchData();
      onQuestionUpdate?.();
    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: "Error",
        description: "Failed to update question.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await dbService.getProvider().execute(
        'DELETE FROM questions WHERE id = ?',
        [questionId]
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question deleted successfully.",
      });

      fetchData();
      onQuestionUpdate?.();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Question Bank</h2>
          <p className="text-muted-foreground">Manage your reusable question repository</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Questions</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search questions or documents..."
                  value={tempSearchTerm}
                  onChange={(e) => setTempSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={tempSelectedSubject} onValueChange={setTempSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {loadingSubjects ? (
                    <SelectItem value="_loading" disabled>Loading subjects...</SelectItem>
                  ) : (
                    uniqueSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.subject_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={tempSelectedDifficulty} onValueChange={setTempSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="All difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  {difficulties.map((difficulty) => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Class Level</Label>
              <Select value={tempSelectedClass} onValueChange={setTempSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {loadingClasses ? (
                    <SelectItem value="_loading" disabled>Loading classes...</SelectItem>
                  ) : (
                    uniqueClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id || cls.class_key || cls.class_name || 'cls'}>
                        {cls.class_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asStudent>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !tempDateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempDateRange?.from ? (
                      tempDateRange.to ? (
                        <>
                          {format(tempDateRange.from, "LLL dd, y")} -{" "}
                          {format(tempDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(tempDateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={tempDateRange?.from}
                    selected={{ from: tempDateRange.from, to: tempDateRange.to }}
                    onSelect={(range) => setTempDateRange(range || {})}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={applyFilters}
            >
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={clearAllFilters}
            >
              Clear All Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAppliedFilter ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <Filter className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-1">Apply Filters to View Questions</h3>
              <p>Please select at least one filter criterion above and click "Apply Filters" to load the question bank.</p>
            </div>
          ) : isLoading ? (
            <TableSkeleton rows={10} columns={6} />
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No questions found matching your criteria.
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedQuestions.map((question, index) => (
                    <TableRow key={`${question.id}-${index}`}>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={question.question_text}>
                          {question.question_text}
                        </div>
                      </TableCell>
                      <TableCell>
                        {uniqueSubjects.find(s => s.id === question.subject_id)?.subject_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getDifficultyBadgeVariant(question.difficulty)}>
                          {question.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {uniqueClasses.find(c => c.id === question.class_id)?.class_name || '-'}
                      </TableCell>
                      <TableCell>
                        {question.page_number || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditQuestion(question)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <PaginationInfo startItem={startItem} endItem={endItem} totalItems={totalItems} />
              <div className="flex items-center gap-2">
                <Label htmlFor="items-per-page" className="text-sm whitespace-nowrap">Rows per page:</Label>
                <Select value={currentItemsPerPage.toString()} onValueChange={(value) => updateItemsPerPage(Number(value))}>
                  <SelectTrigger id="items-per-page" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationFirst 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
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
                  
                  <PaginationItem>
                    <PaginationLast 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(totalPages);
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Question Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Modify the question details below.
            </DialogDescription>
          </DialogHeader>
          
          {editingQuestion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question_text">Question</Label>
                <Textarea
                  id="question_text"
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    question_text: e.target.value
                  })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="option_a">Option A</Label>
                  <Input
                    id="option_a"
                    value={editingQuestion.option_a}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      option_a: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="option_b">Option B</Label>
                  <Input
                    id="option_b"
                    value={editingQuestion.option_b}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      option_b: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="option_c">Option C</Label>
                  <Input
                    id="option_c"
                    value={editingQuestion.option_c}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      option_c: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="option_d">Option D</Label>
                  <Input
                    id="option_d"
                    value={editingQuestion.option_d}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      option_d: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <Select 
                    value={editingQuestion.correct_answer?.toLowerCase()} 
                    onValueChange={(value: 'a' | 'b' | 'c' | 'd') => setEditingQuestion({
                      ...editingQuestion,
                      correct_answer: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select correct answer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">Option A</SelectItem>
                      <SelectItem value="b">Option B</SelectItem>
                      <SelectItem value="c">Option C</SelectItem>
                      <SelectItem value="d">Option D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select 
                    value={editingQuestion.difficulty} 
                    onValueChange={(value: 'easy' | 'medium' | 'difficult') => setEditingQuestion({
                      ...editingQuestion,
                      difficulty: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="difficult">Difficult</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveQuestion}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}