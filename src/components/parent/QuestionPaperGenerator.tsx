import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileQuestion, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PageMultiSelect from '@/components/ui/page-multi-select';
import { supabase } from '@/integrations/supabase/client';
import { useChildSubjects } from '@/hooks/useChildSubjects';
import { useChildClasses } from '@/hooks/useChildClasses';

interface QuestionPaperGeneratorProps {
  onPaperGenerated: () => void;
}

export const QuestionPaperGenerator = ({ onPaperGenerated }: QuestionPaperGeneratorProps) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('');
  
  const [minQuestionsPerPage, setMinQuestionsPerPage] = useState('1');
  const [maxQuestionsPerPage, setMaxQuestionsPerPage] = useState('10');
  const [difficulties, setDifficulties] = useState<('easy' | 'medium' | 'difficult')[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availablePages, setAvailablePages] = useState<number[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const { toast } = useToast();

  // Use child assignments hooks
  const { uniqueSubjects, isLoading: loadingSubjects } = useChildSubjects();
  const { uniqueClasses, isLoading: loadingClasses } = useChildClasses();

  useEffect(() => {
    if (subject && classLevel && difficulties.length > 0) {
      checkAvailableQuestions();
    }
  }, [subject, classLevel, difficulties, selectedPages]);

  useEffect(() => {
    fetchAvailablePages();
  }, [subject, classLevel]);

  const fetchAvailablePages = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user || !subject || !classLevel) {
      setAvailablePages([]);
      setSelectedPages([]);
      return;
    }
    
    // Fetch all pages for documents in this subject/class
    const { data: documents } = await supabase
      .from('documents')
      .select('id, total_pages')
      .eq('user_id', user.user.id)
      .eq('subject_parent_id', subject)
      .eq('class_parent_id', classLevel);
    
    // Get all page numbers from all documents
    const allPages: number[] = [];
    (documents || []).forEach(doc => {
      for (let i = 1; i <= (doc.total_pages || 0); i++) {
        allPages.push(i);
      }
    });
    
    const uniquePages = Array.from(new Set(allPages)).sort((a, b) => a - b);
    setAvailablePages(uniquePages);
    setSelectedPages([]);
  };

  const checkAvailableQuestions = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    let query = supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .in('difficulty', difficulties)
      .eq('subject_parent_id', subject)
      .eq('class_parent_id', classLevel)
      .eq('is_deleted', false);

    if (selectedPages.length > 0) {
      query = query.in('page_number', selectedPages);
    }

    const { count } = await query;

    setAvailableQuestions(count || 0);
  };

  const handleDifficultyChange = (difficulty: string, checked: boolean) => {
    const difficultyLevel = difficulty as 'easy' | 'medium' | 'difficult';
    if (checked) {
      setDifficulties([...difficulties, difficultyLevel]);
    } else {
      setDifficulties(difficulties.filter(d => d !== difficultyLevel));
    }
  };

  const handleGenerate = async () => {
    if (!title || !subject || !classLevel || !totalQuestions || !minQuestionsPerPage || !maxQuestionsPerPage || difficulties.length === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    const questionsNeeded = parseInt(totalQuestions);
    const minPerPage = parseInt(minQuestionsPerPage);
    const maxPerPage = parseInt(maxQuestionsPerPage);

    if (minPerPage > maxPerPage) {
      toast({
        title: "Invalid pagination settings",
        description: "Minimum questions per page cannot be greater than maximum questions per page.",
        variant: "destructive",
      });
      return;
    }

    if (questionsNeeded > availableQuestions) {
      toast({
        title: "Not enough questions",
        description: `You need ${questionsNeeded} questions but only ${availableQuestions} are available.`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create question paper
      const { data: paperData, error: paperError } = await supabase
      .from('question_papers')
        .insert({
          user_id: user.user.id,
          title,
          subject_parent_id: subject,
          class_parent_id: classLevel,
          total_questions: questionsNeeded,
          time_limit_minutes: 0,
          difficulty_filter: difficulties
        })
        .select()
        .single();

      if (paperError) throw paperError;

      // Get questions directly
      let query2: any = supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('subject_parent_id', subject)
        .eq('class_parent_id', classLevel)
        .eq('is_deleted', false)
        .in('difficulty', difficulties);

      if (selectedPages.length > 0) {
        query2 = query2.in('page_number', selectedPages);
      }

      const { data: questions, error: questionsError } = await query2
        .limit(questionsNeeded);

      if (questionsError) throw questionsError;

      // Add questions to question paper
      const paperQuestions = questions.map((q, index) => ({
        question_paper_id: paperData.id,
        question_id: q.id,
        question_order: index + 1
      }));

      const { error: linkError } = await supabase
        .from('question_paper_questions')
        .insert(paperQuestions);

      if (linkError) throw linkError;

      toast({
        title: "Question paper generated",
        description: `Successfully created "${title}" with ${questions.length} questions.`,
      });

      // Reset form
      setTitle('');
      setSubject('');
      setClassLevel('');
      setTotalQuestions('');
      
      setMinQuestionsPerPage('1');
      setMaxQuestionsPerPage('10');
      setDifficulties([]);
      onPaperGenerated();

    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileQuestion className="h-5 w-5" />
          Generate Question Paper
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="title">Paper Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter question paper title"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
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

          <div>
            <Label htmlFor="class">Class Level</Label>
            <Select value={classLevel} onValueChange={setClassLevel}>
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
                    <SelectItem key={cls.id} value={cls.id || cls.class_key || cls.class_name || 'cls'}>
                      {cls.class_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="questions">Total Questions</Label>
            <Input
              id="questions"
              type="number"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(e.target.value)}
              placeholder="e.g., 20"
              min="0"
            />
          </div>

          <div>
            <Label>Pages to Include</Label>
            <PageMultiSelect
              label="Select Pages"
              availablePages={availablePages}
              selectedPages={selectedPages}
              onChange={setSelectedPages}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minPerPage">Minimum Questions per Page</Label>
            <Input
              id="minPerPage"
              type="number"
              value={minQuestionsPerPage}
              onChange={(e) => setMinQuestionsPerPage(e.target.value)}
              placeholder="e.g., 1"
              min="0"
            />
          </div>

          <div>
            <Label htmlFor="maxPerPage">Maximum Questions per Page</Label>
            <Input
              id="maxPerPage"
              type="number"
              value={maxQuestionsPerPage}
              onChange={(e) => setMaxQuestionsPerPage(e.target.value)}
              placeholder="e.g., 10"
              min="0"
            />
          </div>
        </div>

        <div>
          <Label>Difficulty Levels</Label>
          <div className="flex gap-4 mt-2">
            {['easy', 'medium', 'difficult'].map((level) => (
              <div key={level} className="flex items-center space-x-2">
                <Checkbox
                  id={level}
                  checked={difficulties.includes(level as 'easy' | 'medium' | 'difficult')}
                  onCheckedChange={(checked) => handleDifficultyChange(level, checked as boolean)}
                />
                <Label htmlFor={level} className="capitalize">
                  {level}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {subject && classLevel && difficulties.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Available questions: {availableQuestions}
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={!title || !subject || !classLevel || !totalQuestions || !minQuestionsPerPage || !maxQuestionsPerPage || difficulties.length === 0 || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Question Paper'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};