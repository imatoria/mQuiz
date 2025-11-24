import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PaginatedPageMultiSelect } from '@/components/ui/paginated-page-multi-select';
import { Checkbox } from '@/components/ui/checkbox';
import { useChildSubjects } from '@/hooks/useChildSubjects';
import { useChildClasses } from '@/hooks/useChildClasses';

import { supabase } from '@/integrations/supabase/client';
import { 
  Zap, 
  Loader2, 
  Plus, 
  Settings, 
  BookOpen,
  FileText,
  Target,
  Brain,
  Sparkles
} from 'lucide-react';

interface Subject {
  id: string;
  subject_name: string;
}

interface Document {
  id: string;
  title: string;
  processing_status: string;
  subjects_parent?: {
    subject_name: string;
  };
}

interface GenerationConfig {
  topic: string;
  subject_parent_id: string;
  class_parent_id: string;
  difficulty: string;
  question_count: number;
  question_type: string;
  custom_instructions: string;
  document_id?: string;
  selected_pages?: number[];
}

export const AIQuestionGenerator = () => {
  const { uniqueSubjects, isLoading: loadingSubjects } = useChildSubjects();
  const { uniqueClasses, isLoading: loadingClasses } = useChildClasses();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<GenerationConfig>({
    topic: '',
    subject_parent_id: '',
    class_parent_id: '',
    difficulty: 'medium',
    question_count: 5,
    question_type: 'mixed',
    custom_instructions: '',
    document_id: ''
  });
  const { toast } = useToast();
  const [availablePages, setAvailablePages] = useState<number[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [mode, setMode] = useState<'book' | 'independent'>('book');
  const [questionsPerPage, setQuestionsPerPage] = useState(5);

  

  const difficulties = [
    { value: 'easy', label: 'Easy', description: 'Basic recall and understanding' },
    { value: 'medium', label: 'Medium', description: 'Application and analysis' },
    { value: 'difficult', label: 'Difficult', description: 'Synthesis and evaluation' },
    { value: 'mixed', label: 'Mixed', description: 'Variety of difficulty levels' }
  ];

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice', description: '4 options with 1 correct answer' },
    { value: 'true_false', label: 'True/False', description: 'Simple true or false questions' },
    { value: 'fill_blank', label: 'Fill in the Blank', description: 'Complete the sentence' },
    { value: 'mixed', label: 'Mixed Types', description: 'Variety of question formats' }
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch completed documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          processing_status,
          subjects_parent(subject_name)
        `)
        .eq('user_id', user.user.id)
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false });

      setDocuments(documentsData || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchAvailablePages = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user || !config.subject_parent_id || !config.class_parent_id || mode !== 'book') {
      setAvailablePages([]);
      setSelectedPages([]);
      return;
    }

    // Find the most recent completed document for this subject + class
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, total_pages')
      .eq('user_id', user.user.id)
      .eq('subject_parent_id', config.subject_parent_id)
      .eq('class_parent_id', config.class_parent_id)
      .eq('processing_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (docError || !doc) {
      setAvailablePages([]);
      setSelectedPages([]);
      if (config.document_id) setConfig((prev) => ({ ...prev, document_id: '' }));
      return;
    }

    // Fetch actual existing page numbers for this document
    const { data: pagesData, error: pagesError } = await supabase
      .from('document_pages')
      .select('page_number')
      .eq('document_id', doc.id)
      .order('page_number', { ascending: true });

    let pages = Array.from(new Set((pagesData || []).map((p: any) => p.page_number as number)));

    // Fallback to total_pages if no individual pages were found
    if (pages.length === 0) {
      const total = Math.max(0, doc.total_pages || 0);
      pages = total > 0 ? Array.from({ length: total }, (_, i) => i + 1) : [];
    }

    setAvailablePages(pages);
    setSelectedPages([]);

    if (config.document_id !== doc.id) {
      setConfig((prev) => ({ ...prev, document_id: doc.id }));
    }
  };

  useEffect(() => {
    fetchAvailablePages();
  }, [config.subject_parent_id, config.class_parent_id, mode]);

  const handleGenerateQuestions = async () => {
    if (mode === 'independent') {
      if (!config.topic.trim() || !config.subject_parent_id || !config.class_parent_id) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in topic, subject, and class level.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!config.document_id || !config.subject_parent_id || !config.class_parent_id || selectedPages.length === 0) {
        toast({
          title: 'Missing Information',
          description: 'Please select a book and page(s) along with subject and class.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsGenerating(true);

    try {
      const questionCount = mode === 'book'
        ? Math.max(1, questionsPerPage) * selectedPages.length
        : config.question_count;

      const payload = {
        config: { ...config, selected_pages: selectedPages, question_count: questionCount, ...(mode === 'book' ? { topic: config.topic || '' } : {}) },
        mode,
      };

      const { data, error } = await supabase.functions.invoke('generate-ai-questions', {
        body: payload,
      });
      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Questions Generated!',
          description: `Successfully generated ${data.questionsGenerated} questions.`,
        });

        setSelectedPages([]);
        setConfig({
          ...config,
          topic: mode === 'independent' ? '' : config.topic,
          custom_instructions: '',
          document_id: mode === 'book' ? config.document_id : '',
        });
      } else {
        throw new Error(data.error || 'Failed to generate questions');
      }
    } catch (error: any) {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate questions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI Question Generator
        </CardTitle>
        <CardDescription>
          Generate custom questions using AI for any topic or based on your uploaded pages.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Create questions on any topic or enhance your uploaded pages with additional questions.
            Configure your AI providers in settings for best results.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={mode==='book'} onCheckedChange={(v) => setMode(v ? 'book' : 'independent')} />
            Book based
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={mode==='independent'} onCheckedChange={(v) => setMode(v ? 'independent' : 'book')} />
            Independent
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mode === 'independent' && (
            <div className="space-y-2">
              <Label htmlFor="topic">Topic/Theme</Label>
              <Input
                id="topic"
                placeholder="e.g., Photosynthesis, World War II, Algebra basics..."
                value={config.topic}
                onChange={(e) => setConfig({ ...config, topic: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Subject</Label>
            <Select 
              value={config.subject_parent_id} 
              onValueChange={(value) => setConfig({ ...config, subject_parent_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {loadingSubjects ? (
                  <SelectItem value="_loading" disabled>Loading subjects...</SelectItem>
                ) : uniqueSubjects.length === 0 ? (
                  <SelectItem value="_no_subjects" disabled>No subjects assigned to children</SelectItem>
                ) : (
                  uniqueSubjects.map((subj) => (
                    <SelectItem key={subj.id} value={subj.id}>
                      {subj.subject_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Class</Label>
            <Select 
              value={config.class_parent_id} 
              onValueChange={(value) => setConfig({ ...config, class_parent_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {loadingClasses ? (
                  <SelectItem value="_loading" disabled>Loading classes...</SelectItem>
                ) : uniqueClasses.length === 0 ? (
                  <SelectItem value="_no_classes" disabled>No classes assigned to children</SelectItem>
                ) : (
                  uniqueClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.class_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Difficulty Level</Label>
            <Select 
              value={config.difficulty} 
              onValueChange={(value) => setConfig({ ...config, difficulty: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map((diff) => (
                  <SelectItem key={diff.value} value={diff.value}>
                    <div className="font-medium">{diff.label}</div>
                    <div className="text-xs text-muted-foreground">{diff.description}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select 
              value={config.question_type} 
              onValueChange={(value) => setConfig({ ...config, question_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {questionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === 'independent' && (
            <div className="space-y-2">
              <Label htmlFor="count">Number of Questions</Label>
              <Select 
                value={config.question_count.toString()} 
                onValueChange={(value) => setConfig({ ...config, question_count: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 15, 20, 25].map((count) => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} questions
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === 'book' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="questionsPerPage">Number of Questions per Page</Label>
                <Select 
                  value={questionsPerPage.toString()} 
                  onValueChange={(value) => setQuestionsPerPage(parseInt(value))}
                >
                  <SelectTrigger id="questionsPerPage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 10, 15, 20].map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} {count === 1 ? 'question' : 'questions'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Pages</Label>
                <PaginatedPageMultiSelect
                  label="Select Pages"
                  availablePages={availablePages}
                  selectedPages={selectedPages}
                  onChange={setSelectedPages}
                  className="w-full"
                  disabled={!config.subject_parent_id || !config.class_parent_id}
                  disabledPages={[]}
                />
              </div>
            </>
          )}
        </div>


        <div className="space-y-2">
          <Label htmlFor="instructions">Custom Instructions (Optional)</Label>
          <Textarea
            id="instructions"
            placeholder="Any specific requirements for the questions? e.g., focus on practical applications, include diagrams, etc."
            value={config.custom_instructions}
            onChange={(e) => setConfig({ ...config, custom_instructions: e.target.value })}
            rows={3}
          />
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Questions will be added to your Question Bank
          </div>
          
          <Button 
            onClick={handleGenerateQuestions}
            disabled={
              isGenerating ||
              (mode === 'independent'
                ? (!config.topic.trim() || !config.subject_parent_id || !config.class_parent_id)
                : (!config.subject_parent_id || !config.class_parent_id || selectedPages.length === 0 || availablePages.length === 0)
              )
            }
            className="min-w-32"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate Questions
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};