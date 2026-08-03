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
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { useStudentSubjects } from '@/hooks/useStudentSubjects';
import { useStudentClasses } from '@/hooks/useStudentClasses';

interface QuestionPaperGeneratorProps {
  onPaperGenerated: () => void;
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileQuestion, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PageMultiSelect from '@/components/ui/page-multi-select';
import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { useStudentSubjects } from '@/hooks/useStudentSubjects';
import { useStudentClasses } from '@/hooks/useStudentClasses';

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
  const [availableQuestions, setAvailableQuestions] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availablePages, setAvailablePages] = useState<number[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const { toast } = useToast();

  // Use student assignments hooks
  const { uniqueSubjects = [], isLoading: loadingSubjects } = useStudentSubjects();
  const { uniqueClasses = [], isLoading: loadingClasses } = useStudentClasses();

  useEffect(() => {
    if (subject && classLevel) {
      checkAvailableQuestions();
    }
  }, [subject, classLevel, selectedPages]);

  useEffect(() => {
    fetchAvailablePages();
  }, [subject, classLevel]);

  const fetchAvailablePages = async () => {
    const user = authService.getCurrentUser();
    if (!user || !subject || !classLevel) {
      setAvailablePages([]);
      setSelectedPages([]);
      return;
    }
    
    // Fetch all pages for documents in this subject/class
    const { data: documents } = await dbService.getProvider().query(
      'SELECT id, total_pages FROM documents WHERE user_id = ? AND subject_id = ? AND class_id = ?',
      [user.id, subject, classLevel]
    );
    
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
    const user = authService.getCurrentUser();
    if (!user) return;

    let query = 'SELECT COUNT(*) as count FROM questions WHERE is_deleted = 0 AND subject_id = ? AND class_id = ?';
    let params: any[] = [subject, classLevel];

    if (selectedPages.length > 0) {
      query += ` AND page_number IN (${selectedPages.map(() => '?').join(',')})`;
      params.push(...selectedPages);
    }

    const { data } = await dbService.getProvider().query(query, params);
    setAvailableQuestions(data?.[0]?.count || 0);
  };

  const handleGenerate = async () => {
    if (!title || !subject || !classLevel || !totalQuestions || !minQuestionsPerPage || !maxQuestionsPerPage) {
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
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const paperId = crypto.randomUUID();
      // Create question paper
      const { error: paperError } = await dbService.getProvider().execute(
        `INSERT INTO question_papers (id, user_id, title, subject_id, class_id, total_questions, time_limit_minutes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [paperId, user.id, title, subject, classLevel, questionsNeeded, 0]
      );

      if (paperError) throw paperError;

      // Get questions directly
      let queryStr = 'SELECT * FROM questions WHERE user_id = ? AND subject_id = ? AND class_id = ? AND is_deleted = 0';
      let params: any[] = [user.id, subject, classLevel];

      if (selectedPages.length > 0) {
        queryStr += ` AND page_number IN (${selectedPages.map(() => '?').join(',')})`;
        params.push(...selectedPages);
      }
      
      queryStr += ` LIMIT ${questionsNeeded}`;

      const { data: questions, error: questionsError } = await dbService.getProvider().query(queryStr, params);

      if (questionsError) throw questionsError;

      // Add questions to question paper
      const paperQuestions = (questions || []).map((q: any, index: number) => ({
        id: crypto.randomUUID(),
        question_paper_id: paperId,
        question_id: q.id,
        question_order: index + 1
      }));

      for (const pq of paperQuestions) {
        const { error: linkError } = await dbService.getProvider().execute(
          'INSERT INTO question_paper_questions (id, question_paper_id, question_id, question_order) VALUES (?, ?, ?, ?)',
          [pq.id, pq.question_paper_id, pq.question_id, pq.question_order]
        );
        if (linkError) throw linkError;
      }

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
      onPaperGenerated();

    } catch (error: any) {
          ) : (
            'Generate Question Paper'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};