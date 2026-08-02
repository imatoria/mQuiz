import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { useAuth } from '@/hooks/useAuth';
import { usePagination } from '@/hooks/usePagination';
import { useChildSubjects } from '@/hooks/useChildSubjects';
import { useChildClasses } from '@/hooks/useChildClasses';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  FileText, 
  Calendar as CalendarIcon, 
  AlertCircle,
  CheckCircle2,
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { PageMultiSelect } from '@/components/ui/page-multi-select';

interface Subject {
  id: string;
  name: string;
}

interface ClassLevel {
  id: string;
  class_name: string;
  class_key: string;
  parent_id: string;
}

interface Child {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  difficulty: 'easy' | 'medium' | 'difficult';
  topic?: string;
  page_number?: number;
  created_at: string;
}

interface PaperFormData {
  title: string;
  subject_id: string;
  class_id: string;
  total_questions: number;
  time_limit_minutes: number;
  start_time?: Date;
  end_time?: Date;
  max_attempts: number;
  assign_to_all: boolean;
  show_results: boolean;
  difficulty_filter?: string[];
  difficulty?: string;
  selected_children?: string[];
  selected_questions?: string[];
}

interface UnifiedPaperCreatorProps {
  onRefresh?: () => void;
  editingPaper?: any;
  onPaperCreated?: () => void;
}

export const UnifiedPaperCreator: React.FC<UnifiedPaperCreatorProps> = ({ onRefresh, editingPaper, onPaperCreated }) => {
  const [formData, setFormData] = useState<PaperFormData>({
    title: '',
    subject_id: '',
    class_id: '',
    total_questions: 10,
    time_limit_minutes: 60,
    max_attempts: 1,
    assign_to_all: true,
    show_results: false,
    difficulty_filter: [], // Empty by default for single-select
    difficulty: '',
    selected_children: [],
    selected_questions: []
  });
  
  const [children, setChildren] = useState<Child[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [questionFilters, setQuestionFilters] = useState({
    search: '',
    topic: '',
    page_numbers: [] as number[],
    dateRange: { from: undefined as Date | undefined, to: undefined as Date | undefined }
  });
  const [availablePages, setAvailablePages] = useState<number[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [questionTabValue, setQuestionTabValue] = useState<string>('');
  
  // Refs for popovers
  const startTimePopoverRef = useRef<{ close: () => void } | null>(null);
  const endTimePopoverRef = useRef<{ close: () => void } | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use child assignments hooks (same as Upload tab)
  const { uniqueSubjects, isLoading: loadingSubjects } = useChildSubjects();
  const { uniqueClasses, isLoading: loadingClasses } = useChildClasses();
  
  // When editing, ensure the paper's subject/class are available even if not currently assigned to children
  const subjects = React.useMemo(() => {
    const subjectsList = uniqueSubjects.map(s => ({ id: s.id, name: s.subject_name }));
    
    // If editing and the paper's subject isn't in the list, add it
    if (editingPaper?.subject_id && editingPaper?.subjects) {
      const paperSubjectExists = subjectsList.some(s => s.id === editingPaper.subject_id);
      if (!paperSubjectExists) {
        subjectsList.unshift({
          id: editingPaper.subject_id,
          name: editingPaper.subjects.subject_name
        });
      }
    }
    
    return subjectsList;
  }, [uniqueSubjects, editingPaper?.subject_id, editingPaper?.subjects]);
  
  const classes = React.useMemo(() => {
    const classesList = [...uniqueClasses];
    
    // If editing and the paper's class isn't in the list, add it
    if (editingPaper?.class_id && editingPaper?.classes) {
      const paperClassExists = classesList.some(c => c.id === editingPaper.class_id);
      if (!paperClassExists) {
        classesList.unshift({
          id: editingPaper.class_id,
          class_name: editingPaper.classes.class_name,
          class_key: editingPaper.classes.class_key || ''
        });
      }
    }
    
    return classesList;
  }, [uniqueClasses, editingPaper?.class_id, editingPaper?.classes]);

  React.useEffect(() => {
    if (user?.id) {
      loadChildren();
    }
  }, [user?.id]);

  // Effect to populate form when editing
  React.useEffect(() => {
    if (editingPaper) {
      setFormData(prev => ({
        ...prev,
        title: editingPaper.title || '',
        subject_id: editingPaper.subject_id || '',
        class_id: editingPaper.class_id || '',
        total_questions: editingPaper.total_questions || 10,
        time_limit_minutes: editingPaper.time_limit_minutes || 60,
        start_time: editingPaper.start_time ? new Date(editingPaper.start_time) : undefined,
        end_time: editingPaper.end_time ? new Date(editingPaper.end_time) : undefined,
        max_attempts: editingPaper.max_attempts || 1,
        assign_to_all: editingPaper.assign_to_all ?? true,
        show_results: editingPaper.show_results || false,
        difficulty_filter: editingPaper.difficulty_filter && editingPaper.difficulty_filter.length > 0 
          ? [editingPaper.difficulty_filter[0]] 
          : [],
      }));
      
      // Set default tab based on editing vs creating
      setQuestionTabValue(editingPaper ? 'selected' : 'unselected');
      
      // Load selected questions for editing
      if (editingPaper.id) {
        loadSelectedQuestions(editingPaper.id);
      }
    } else {
      // For new papers, default to unselected tab
      setQuestionTabValue('unselected');
    }
  }, [editingPaper]);

  React.useEffect(() => {
    if (formData.subject_id && formData.class_id) {
      loadAvailablePages();
    } else {
      setAvailablePages([]);
    }
  }, [formData.subject_id, formData.class_id]);

  // Auto-set difficulty filter when form difficulty is selected (removed as no longer needed)

  React.useEffect(() => {
    if (formData.subject_id && formData.class_id) {
      loadQuestions();
      loadAvailablePages();
    } else {
      setQuestions([]);
      setFilteredQuestions([]);
    }
  }, [formData.subject_id, formData.class_id, formData.difficulty_filter]);

  // Effect to handle criteria changes and update selected questions visibility
  React.useEffect(() => {
    if (selectedQuestions.length > 0 && formData.subject_id && formData.class_id) {
      // Filter out questions that no longer meet the current criteria
      const validQuestions = selectedQuestions.filter(question => {
        const matchesDifficulty = !formData.difficulty_filter?.length || formData.difficulty_filter.includes(question.difficulty);
        return matchesDifficulty;
      });

      // Update selected questions to only include valid ones
      const validQuestionIds = validQuestions.map(q => q.id);
      if (validQuestionIds.length !== formData.selected_questions?.length) {
        setSelectedQuestions(validQuestions);
        setFormData(prev => ({
          ...prev,
          selected_questions: validQuestionIds
        }));
      }
    }
  }, [formData.difficulty_filter]);

  React.useEffect(() => {
    applyQuestionFilters();
  }, [questions, questionFilters, formData.selected_questions]);

  const loadChildren = async () => {
    if (!user?.id) {
      console.log('No user ID available, skipping children load');
      return;
    }
    
    try {
      console.log('Loading children for user:', user.id);
      // Get child IDs first
      const { data: relationships, error: relError } = await dbService.getProvider().query(
        'SELECT child_id FROM parent_child_relationships WHERE parent_id = ?',
        [user.id]
      );
      
      if (relError) throw relError;
      
      if (!relationships || relationships.length === 0) {
        setChildren([]);
        return;
      }
      
      // Get children profiles
      const childIds = relationships.map((r: any) => r.child_id);
      
      const { data: childProfiles, error: profileError } = await dbService.getProvider().query(
        `SELECT id, user_id, full_name, email FROM profiles WHERE user_id IN (${childIds.map(() => '?').join(',')})`,
        childIds
      );
      
      if (profileError) throw profileError;
      
      setChildren(childProfiles || []);
    } catch (error) {
      console.error('Error loading children:', error);
    }
  };

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      // Get all subjects and classes from database to resolve matching names across duplicate IDs
      const { data: allSubjectsData } = await dbService.getProvider().query('SELECT * FROM subjects');
      const { data: allClassesData } = await dbService.getProvider().query('SELECT * FROM classes');

      const selectedSubjectObj = (allSubjectsData || []).find((s: any) => s.id === formData.subject_id);
      const matchingSubjectIds = selectedSubjectObj
        ? (allSubjectsData || []).filter((s: any) => s.subject_name?.toLowerCase() === selectedSubjectObj.subject_name?.toLowerCase()).map((s: any) => s.id)
        : (formData.subject_id ? [formData.subject_id] : []);

      const selectedClassObj = (allClassesData || []).find((c: any) => c.id === formData.class_id);
      const matchingClassIds = selectedClassObj
        ? (allClassesData || []).filter((c: any) => c.class_name?.toLowerCase() === selectedClassObj.class_name?.toLowerCase()).map((c: any) => c.id)
        : (formData.class_id ? [formData.class_id] : []);

      const { data: rawQuestions, error } = await dbService.getProvider().query(
        'SELECT * FROM questions WHERE is_deleted = 0 ORDER BY created_at DESC'
      );

      if (error) throw error;

      const filtered = (rawQuestions || []).filter((q: any) => {
        // Match subject if selected
        const matchesSubject = matchingSubjectIds.length === 0 || matchingSubjectIds.includes(q.subject_id) || !q.subject_id;
        // Match class if selected
        const matchesClass = matchingClassIds.length === 0 || matchingClassIds.includes(q.class_id) || !q.class_id;
        // Match difficulty if specified
        const matchesDifficulty = !formData.difficulty_filter || formData.difficulty_filter.length === 0 || formData.difficulty_filter.includes('all') || formData.difficulty_filter.includes(q.difficulty);
        return matchesSubject && matchesClass && matchesDifficulty;
      });

      setQuestions(filtered);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive"
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const loadSelectedQuestions = async (paperId: string) => {
    try {
      const { data: qpqData, error: qpqError } = await dbService.getProvider().query(
        'SELECT * FROM question_paper_questions WHERE question_paper_id = ?',
        [paperId]
      );
      
      if (qpqError) throw qpqError;

      const questionIds = (qpqData || []).map((item: any) => item.question_id || item.questions?.id).filter(Boolean);

      if (questionIds.length > 0) {
        const { data: allQuestions } = await dbService.getProvider().query(
          `SELECT * FROM questions WHERE id IN (${questionIds.map(() => '?').join(',')})`,
          questionIds
        );

        const qMap = new Map((allQuestions || []).map((q: any) => [q.id, q]));
        
        // Preserve question order
        const questionsList = questionIds.map((qId: string) => qMap.get(qId)).filter(Boolean);
        
        setSelectedQuestions(questionsList);
        setFormData(prev => ({
          ...prev,
          selected_questions: questionsList.map((q: any) => q.id)
        }));
      } else {
        setSelectedQuestions([]);
      }
    } catch (error) {
      console.error('Error loading selected questions:', error);
    }
  };

  const loadAvailablePages = async () => {
    if (!formData.subject_id || !formData.class_id) return;
    
    try {
      // Get unique page numbers for the selected subject and class level
      const { data, error } = await dbService.getProvider().query(
        'SELECT page_number FROM questions WHERE subject_id = ? AND class_id = ? AND is_deleted = 0 AND page_number IS NOT NULL ORDER BY page_number',
        [formData.subject_id, formData.class_id]
      );
      
      if (error) throw error;
      
      const uniquePages = [...new Set(data?.map(q => q.page_number).filter(Boolean) || [])] as number[];
      setAvailablePages(uniquePages.sort((a, b) => a - b));
    } catch (error) {
      console.error('Error loading available pages:', error);
      setAvailablePages([]);
    }
  };

  const applyQuestionFilters = () => {
    let filtered = [...questions];
    
    // Filter out already selected questions
    if (formData.selected_questions && formData.selected_questions.length > 0) {
      filtered = filtered.filter(q => !formData.selected_questions?.includes(q.id));
    }
    
    if (questionFilters.search) {
      filtered = filtered.filter(q => 
        q.question_text.toLowerCase().includes(questionFilters.search.toLowerCase()) ||
        q.topic?.toLowerCase().includes(questionFilters.search.toLowerCase()) ||
        q.option_a.toLowerCase().includes(questionFilters.search.toLowerCase()) ||
        q.option_b.toLowerCase().includes(questionFilters.search.toLowerCase()) ||
        q.option_c.toLowerCase().includes(questionFilters.search.toLowerCase()) ||
        q.option_d.toLowerCase().includes(questionFilters.search.toLowerCase())
      );
    }
    
    if (questionFilters.page_numbers.length > 0) {
      filtered = filtered.filter(q => q.page_number && questionFilters.page_numbers.includes(q.page_number));
    }
    
    // Date range filtering
    if (questionFilters.dateRange.from || questionFilters.dateRange.to) {
      filtered = filtered.filter(q => {
        const questionDate = new Date(q.created_at);
        const matchesFrom = !questionFilters.dateRange.from || questionDate >= questionFilters.dateRange.from;
        const matchesTo = !questionFilters.dateRange.to || questionDate <= questionFilters.dateRange.to;
        return matchesFrom && matchesTo;
      });
    }
    
    setFilteredQuestions(filtered);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.subject_id) newErrors.subject_id = 'Subject is required';
    if (!formData.class_id) newErrors.class_id = 'Class level is required';
    
    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      newErrors.end_time = 'End time must be after start time';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const paperData = {
        title: formData.title,
        subject_id: formData.subject_id,
        class_id: formData.class_id,
        total_questions: formData.total_questions,
        time_limit_minutes: formData.time_limit_minutes,
        user_id: user?.id,
        start_time: formData.start_time?.toISOString() || null,
        end_time: formData.end_time?.toISOString() || null,
        max_attempts: formData.max_attempts,
        assign_to_all: formData.assign_to_all,
        show_results: formData.show_results,
        difficulty_filter: formData.difficulty_filter as ("easy" | "medium" | "difficult")[] || []
      };
      
      let paperId: string;
      
      if (editingPaper) {
        // Update existing paper
        const { error } = await dbService.getProvider().execute(
          'UPDATE question_papers SET title = ?, subject_id = ?, class_id = ?, total_questions = ?, time_limit_minutes = ?, start_time = ?, end_time = ?, max_attempts = ?, assign_to_all = ?, show_results = ?, difficulty_filter = ? WHERE id = ?',
          [
            paperData.title, paperData.subject_id, paperData.class_id, paperData.total_questions, 
            paperData.time_limit_minutes, paperData.start_time, paperData.end_time, paperData.max_attempts, 
            paperData.assign_to_all ? 1 : 0, paperData.show_results ? 1 : 0, JSON.stringify(paperData.difficulty_filter), 
            editingPaper.id
          ]
        );
        
        if (error) throw error;
        paperId = editingPaper.id;
        
        // Delete existing assignments for this paper
        await dbService.getProvider().execute(
          'DELETE FROM paper_assignments WHERE paper_id = ?',
          [paperId]
        );
      } else {
        // Create new paper
        paperId = crypto.randomUUID();
        const { error } = await dbService.getProvider().execute(
          'INSERT INTO question_papers (id, user_id, title, subject_id, class_id, total_questions, time_limit_minutes, start_time, end_time, max_attempts, assign_to_all, show_results, difficulty_filter) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            paperId, paperData.user_id, paperData.title, paperData.subject_id, paperData.class_id, paperData.total_questions, 
            paperData.time_limit_minutes, paperData.start_time, paperData.end_time, paperData.max_attempts, 
            paperData.assign_to_all ? 1 : 0, paperData.show_results ? 1 : 0, JSON.stringify(paperData.difficulty_filter)
          ]
        );
        
        if (error) throw error;
      }

      // Handle selected questions - delete existing and insert new ones
      if (formData.selected_questions && formData.selected_questions.length > 0) {
        // Delete existing question-paper relationships if editing
        if (editingPaper) {
          const { error: deleteError } = await dbService.getProvider().execute(
            'DELETE FROM question_paper_questions WHERE question_paper_id = ?',
            [paperId]
          );

          if (deleteError) throw deleteError;
        }

        // Insert new question-paper relationships
        for (let i = 0; i < formData.selected_questions.length; i++) {
          const questionId = formData.selected_questions[i];
          const { error: questionsError } = await dbService.getProvider().execute(
            'INSERT INTO question_paper_questions (id, question_paper_id, question_id, question_order) VALUES (?, ?, ?, ?)',
            [crypto.randomUUID(), paperId, questionId, i + 1]
          );

          if (questionsError) throw questionsError;
        }
      }

      // If not assigning to all children, create individual assignments
      if (!formData.assign_to_all && formData.selected_children && formData.selected_children.length > 0) {
        for (const childId of formData.selected_children) {
          const { error: assignmentError } = await dbService.getProvider().execute(
            'INSERT INTO paper_assignments (id, paper_id, assigned_to_user_id) VALUES (?, ?, ?)',
            [crypto.randomUUID(), paperId, childId]
          );

          if (assignmentError) throw assignmentError;
        }
      }
      
      toast({
        title: "Success",
        description: editingPaper ? "Paper updated successfully!" : "Paper created successfully!",
        variant: "default"
      });
      
      // Reset form only if not editing
      if (!editingPaper) {
        setFormData({
          title: '',
          subject_id: '',
          class_id: '',
          total_questions: 10,
          time_limit_minutes: 60,
          max_attempts: 1,
          assign_to_all: true,
          show_results: false,
          difficulty_filter: [], // Empty by default for single-select
          selected_children: [],
          selected_questions: []
        });
      }
      
      // Call success callback
      onPaperCreated?.();
      
    } catch (error) {
      console.error('Error saving paper:', error);
      toast({
        title: "Error",
        description: editingPaper ? "Failed to update paper" : "Failed to create paper",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { paginatedData: paginatedQuestions, ...pagination } = usePagination({
    data: filteredQuestions,
    itemsPerPage: 10
  });

  const handleSelectAllVisible = () => {
    const availableToSelect = Math.min(
      paginatedQuestions.length,
      formData.total_questions - (formData.selected_questions?.length || 0)
    );
    
    if (availableToSelect === 0) {
      toast({
        title: "Selection Limit",
        description: `You can only select ${formData.total_questions} questions total`,
        variant: "destructive"
      });
      return;
    }
    
    const newSelections = paginatedQuestions
      .slice(0, availableToSelect)
      .filter(q => !formData.selected_questions?.includes(q.id))
      .map(q => q.id);
    
    setFormData(prev => ({
      ...prev,
      selected_questions: [...(prev.selected_questions || []), ...newSelections]
    }));
  };

  const handleSelectRandomly = () => {
    // Only select from all valid filtered questions that haven't been selected yet
    const availableQuestions = filteredQuestions.filter(q => !formData.selected_questions?.includes(q.id));
    
    // Amount we still need to select
    const amountToSelect = Math.min(
      availableQuestions.length,
      formData.total_questions - (formData.selected_questions?.length || 0)
    );
    
    if (amountToSelect <= 0) {
      toast({
        title: "Selection Limit",
        description: `You have already selected ${formData.total_questions} questions total`,
        variant: "destructive"
      });
      return;
    }
    
    // Shuffle and pick
    const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
    const randomSelections = shuffled.slice(0, amountToSelect);
    const newSelectionIds = randomSelections.map(q => q.id);
    
    setSelectedQuestions(prev => [...prev, ...randomSelections]);
    setFormData(prev => ({
      ...prev,
      selected_questions: [...(prev.selected_questions || []), ...newSelectionIds]
    }));
    
    toast({
      title: "Random Selection",
      description: `Randomly selected ${amountToSelect} question${amountToSelect !== 1 ? 's' : ''}.`
    });
  };

  const handleQuestionSelect = (questionId: string, checked: boolean) => {
    if (checked) {
      if ((formData.selected_questions?.length || 0) >= formData.total_questions) {
        toast({
          title: "Selection Limit",
          description: `You can only select ${formData.total_questions} questions`,
          variant: "destructive"
        });
        return;
      }
      
      // Find the question in filteredQuestions to add to selectedQuestions
      const question = filteredQuestions.find(q => q.id === questionId);
      if (question) {
        setSelectedQuestions(prev => [...prev, question]);
      }
      
      setFormData(prev => ({
        ...prev,
        selected_questions: [...(prev.selected_questions || []), questionId]
      }));
    } else {
      // Remove from selectedQuestions
      setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
      
      setFormData(prev => ({
        ...prev,
        selected_questions: prev.selected_questions?.filter(id => id !== questionId) || []
      }));
    }
  };

  const handleRemoveSelectedQuestion = (questionId: string) => {
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
    setFormData(prev => ({
      ...prev,
      selected_questions: prev.selected_questions?.filter(id => id !== questionId) || []
    }));
  };

  const getDifficultyBadgeVariant = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'secondary';
      case 'medium': return 'default';
      case 'difficult': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          {editingPaper ? 'Edit Question Paper' : 'Create Question Paper'}
        </CardTitle>
        <CardDescription>
          {editingPaper ? 'Update your existing question paper configuration' : 'Create a new question paper with all configuration options'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Paper Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter paper title"
                className={cn(errors.title && "border-destructive")}
              />
              {errors.title && (
                <p className="text-sm text-destructive flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.title}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Subject *</Label>
              {editingPaper ? (
                <Input
                  value={editingPaper.subjects?.subject_name || 'Unknown Subject'}
                  disabled
                  readOnly
                />
              ) : (
                <Select 
                  value={formData.subject_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: value }))}
                  disabled={loadingSubjects}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSubjects ? (
                      <SelectItem value="_loading" disabled>Loading subjects...</SelectItem>
                    ) : subjects.length === 0 ? (
                      <SelectItem value="_no_subjects" disabled>No subjects assigned to children</SelectItem>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Class Level *</Label>
              {editingPaper ? (
                <Input
                  value={editingPaper.classes?.class_name || 'Unknown Class'}
                  disabled
                  readOnly
                />
              ) : (
                <Select 
                  value={formData.class_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: value }))}
                  disabled={loadingClasses}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingClasses ? (
                      <SelectItem value="_loading" disabled>Loading classes...</SelectItem>
                    ) : classes.length === 0 ? (
                      <SelectItem value="_no_classes" disabled>No classes assigned to children</SelectItem>
                    ) : (
                      classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.class_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Total Questions</Label>
              <Input
                type="number"
                value={formData.total_questions}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, total_questions: val === '' ? 0 : (parseInt(val) || 0) }));
                }}
                min="0"
                max="100"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Time Limit (Minutes)</Label>
              <Input
                type="number"
                value={formData.time_limit_minutes}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, time_limit_minutes: val === '' ? 0 : (parseInt(val) || 0) }));
                }}
                min="0"
                max="600"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Max Attempts</Label>
              <Input
                type="number"
                value={formData.max_attempts}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, max_attempts: val === '' ? 0 : (parseInt(val) || 0) }));
                }}
                min="0"
                max="10"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Difficulty Level</Label>
              <Select 
                value={formData.difficulty_filter?.[0] || 'all'} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  difficulty_filter: value && value !== 'all' ? [value] : ['all'] 
                }))}
                disabled={!!editingPaper}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="difficult">Difficult</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Scheduling and Settings Section - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Test Scheduling */}
            <div className="space-y-4">
              <h3 className="font-medium">Test Scheduling (Optional)</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_time ? format(formData.start_time, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.start_time}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, start_time: date }));
                          setTimeout(() => {
                            const popoverTrigger = document.querySelector('[data-radix-popper-content-wrapper]');
                            if (popoverTrigger) {
                              const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
                              document.dispatchEvent(escapeEvent);
                            }
                          }, 100);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_time ? format(formData.end_time, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.end_time}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, end_time: date }));
                          setTimeout(() => {
                            const popoverTrigger = document.querySelector('[data-radix-popper-content-wrapper]');
                            if (popoverTrigger) {
                              const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
                              document.dispatchEvent(escapeEvent);
                            }
                          }, 100);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            {/* Assignment & Results Settings */}
            <div className="space-y-4">
              <h3 className="font-medium">Assignment & Results Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={formData.assign_to_all}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      assign_to_all: checked,
                      selected_children: checked ? [] : prev.selected_children
                    }))}
                  />
                  <Label>Assign to All Children</Label>
                </div>
                
                {!formData.assign_to_all && (
                  <div className="space-y-3">
                    <Label className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Select Children to Assign
                    </Label>
                    {children.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No children found. Add children to your account first.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                        {children.map((child) => (
                          <div key={child.id} className="flex items-center space-x-2 p-2 border rounded">
                            <Checkbox
                              id={child.id}
                              checked={formData.selected_children?.includes(child.user_id) || false}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    selected_children: [...(prev.selected_children || []), child.user_id]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    selected_children: prev.selected_children?.filter(id => id !== child.user_id) || []
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={child.id} className="text-sm">
                              {child.full_name || child.email}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={formData.show_results}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_results: checked }))}
                  />
                  <Label>Auto-approve Results</Label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Question Selection Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center">
                <Search className="w-4 h-4 mr-2" />
                Select Questions
              </h3>
            </div>
              
              <Tabs value={questionTabValue} onValueChange={setQuestionTabValue} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="selected" className="flex items-center gap-2">
                    Selected Questions
                    {selectedQuestions.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {selectedQuestions.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="unselected" className="flex items-center gap-2">
                    Unselected Questions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="selected" className="space-y-4">
                  {selectedQuestions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No questions selected yet. Go to "Unselected Questions" tab to add questions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                        </p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Clear All
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Clear All Selected Questions?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove all {selectedQuestions.length} selected question{selectedQuestions.length !== 1 ? 's' : ''} from the paper. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  setSelectedQuestions([]);
                                  setFormData(prev => ({ ...prev, selected_questions: [] }));
                                  toast({
                                    title: "Questions Cleared",
                                    description: "All selected questions have been removed"
                                  });
                                }}
                              >
                                Clear All
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Remove</TableHead>
                              <TableHead>Question</TableHead>
                              <TableHead className="w-24">Difficulty</TableHead>
                              <TableHead className="w-32">Topic</TableHead>
                              <TableHead className="w-20">Page</TableHead>
                            </TableRow>
                          </TableHeader>
                        <TableBody>
                          {selectedQuestions.map((question, index) => {
                            // Check if question matches current difficulty filter
                            const matchesDifficulty = !formData.difficulty_filter?.length || formData.difficulty_filter.includes(question.difficulty);
                            const isValid = matchesDifficulty;
                            
                            return (
                              <TableRow 
                                key={`${question.id}-${index}`} 
                                className={cn(!isValid && "opacity-50 bg-muted/50")}
                              >
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveSelectedQuestion(question.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                                <TableCell className="max-w-md">
                                  <div className="truncate" title={question.question_text}>
                                    {question.question_text}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-1">
                                    <div>A) {question.option_a}</div>
                                    <div>B) {question.option_b}</div>
                                    <div>C) {question.option_c}</div>
                                    <div>D) {question.option_d}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getDifficultyBadgeVariant(question.difficulty)}>
                                    {question.difficulty}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{question.topic || 'N/A'}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{question.page_number || '-'}</span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                       </Table>
                      </div>
                      {selectedQuestions.some(q => {
                        const matchesDifficulty = !formData.difficulty_filter?.length || formData.difficulty_filter.includes(q.difficulty);
                        return !matchesDifficulty;
                      }) && (
                        <div className="p-3 bg-amber-50 border-amber-200 border rounded text-sm text-amber-800">
                          <AlertCircle className="w-4 h-4 inline mr-2" />
                          Some selected questions don't match current difficulty criteria and will be excluded from the paper.
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="unselected" className="space-y-4">
                  {/* Requirement Notice (Informative tip when filters not selected) */}
                  {(!formData.subject_id || !formData.class_id) && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        <p className="text-sm text-blue-700">
                          Showing all available questions. Select <strong>Subject</strong> and <strong>Class Level</strong> above to filter for a specific class paper.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Question Selection Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Search Questions</Label>
                        <Input
                          placeholder="Search by question text, options, or topic..."
                          value={questionFilters.search}
                          onChange={(e) => setQuestionFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Filter by Pages</Label>
                        <PageMultiSelect
                          label="Select Pages"
                          availablePages={availablePages}
                          selectedPages={questionFilters.page_numbers}
                          onChange={(pages) => setQuestionFilters(prev => ({ ...prev, page_numbers: pages }))}
                          disabled={availablePages.length === 0}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Date Range</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !questionFilters.dateRange.from && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {questionFilters.dateRange?.from ? (
                                questionFilters.dateRange.to ? (
                                  <>
                                    {format(questionFilters.dateRange.from, "LLL dd, y")} -{" "}
                                    {format(questionFilters.dateRange.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(questionFilters.dateRange.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Pick date range</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={questionFilters.dateRange?.from}
                              selected={{ from: questionFilters.dateRange.from, to: questionFilters.dateRange.to }}
                              onSelect={(range) => setQuestionFilters(prev => ({ 
                                ...prev, 
                                dateRange: { 
                                  from: range?.from, 
                                  to: range?.to 
                                }
                              }))}
                              numberOfMonths={2}
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  
                  <div className="flex items-center justify-between">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setQuestionFilters(prev => ({ 
                            ...prev, 
                            search: '', 
                            page_numbers: [],
                            dateRange: { from: undefined, to: undefined }
                          }))}
                        >
                          Clear Filters
                        </Button>
                        
                        <div className="flex gap-2">
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            onClick={handleSelectRandomly}
                            disabled={
                              filteredQuestions.length === 0 || 
                              (formData.selected_questions?.length || 0) >= formData.total_questions
                            }
                          >
                            Select Randomly
                          </Button>
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm"
                            onClick={handleSelectAllVisible}
                            disabled={
                              paginatedQuestions.length === 0 || 
                              (formData.selected_questions?.length || 0) >= formData.total_questions
                            }
                          >
                            Select All Visible
                          </Button>
                        </div>
                      </div>
                      
                      {isLoadingQuestions ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">Loading questions...</p>
                        </div>
                      ) : filteredQuestions.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            No questions found for the selected criteria.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Questions Table */}
                          <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Select</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead className="w-24">Difficulty</TableHead>
                            <TableHead className="w-32">Topic</TableHead>
                            <TableHead className="w-20">Page</TableHead>
                          </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedQuestions.map((question, index) => (
                              <TableRow key={`${question.id}-${index}`}>
                                <TableCell>
                                  <Checkbox
                                    checked={formData.selected_questions?.includes(question.id) || false}
                                    onCheckedChange={(checked) => handleQuestionSelect(question.id, !!checked)}
                                    disabled={(formData.selected_questions?.length || 0) >= formData.total_questions && !formData.selected_questions?.includes(question.id)}
                                  />
                                </TableCell>
                                <TableCell className="max-w-md">
                                  <div className="truncate" title={question.question_text}>
                                    {question.question_text}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 gap-1">
                                    <div>A) {question.option_a}</div>
                                    <div>B) {question.option_b}</div>
                                    <div>C) {question.option_c}</div>
                                    <div>D) {question.option_d}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getDifficultyBadgeVariant(question.difficulty)}>
                                    {question.difficulty}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{question.topic || 'N/A'}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{question.page_number || '-'}</span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                       </div>
                       
                       {/* Pagination */}
                       {pagination.totalPages > 1 && (
                         <div className="flex items-center justify-between">
                           <div className="text-sm text-muted-foreground">
                             Showing {pagination.startItem} to {pagination.endItem} of {pagination.totalItems} questions
                           </div>
                           <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={pagination.previousPage}
                                disabled={!pagination.canGoPrevious}
                              >
                                <ChevronLeft className="w-4 w-4" />
                                Previous
                              </Button>
                              <span className="text-sm">
                                Page {pagination.currentPage} of {pagination.totalPages}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={pagination.nextPage}
                                disabled={!pagination.canGoNext}
                              >
                                Next
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                           </div>
                         </div>
                       )}
                      </>
                    )}
               </TabsContent>
           </Tabs>
         </div>
        
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline">Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>{editingPaper ? 'Updating...' : 'Creating...'}</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {editingPaper ? 'Update Paper' : 'Create Paper'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};