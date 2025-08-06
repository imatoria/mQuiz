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
import { AIKeyStatusOverview } from './AIKeyStatusOverview';
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
  name: string;
}

interface Document {
  id: string;
  title: string;
  processing_status: string;
  subjects?: {
    name: string;
  };
}

interface GenerationConfig {
  topic: string;
  subject_id: string;
  class_level: string;
  difficulty: string;
  question_count: number;
  question_type: string;
  custom_instructions: string;
  document_id?: string;
}

export const AIQuestionGenerator = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<GenerationConfig>({
    topic: '',
    subject_id: '',
    class_level: '',
    difficulty: 'medium',
    question_count: 5,
    question_type: 'mixed',
    custom_instructions: '',
    document_id: ''
  });
  const { toast } = useToast();

  const classLevels = [
    'grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6',
    'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12'
  ];

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

      // Fetch completed documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          processing_status,
          subjects(name)
        `)
        .eq('user_id', user.user.id)
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false });

      setSubjects(subjectsData || []);
      setDocuments(documentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!config.topic.trim() || !config.subject_id || !config.class_level) {
      toast({
        title: "Missing Information",
        description: "Please fill in topic, subject, and class level.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Call the AI question generation edge function
      const { data, error } = await supabase.functions.invoke('generate-ai-questions', {
        body: {
          config: config
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Questions Generated!",
          description: `Successfully generated ${data.questionsGenerated} questions.`,
        });

        // Reset form
        setConfig({
          ...config,
          topic: '',
          custom_instructions: '',
          document_id: ''
        });
      } else {
        throw new Error(data.error || 'Failed to generate questions');
      }

    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <AIKeyStatusOverview />
      
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI Question Generator
        </CardTitle>
        <CardDescription>
          Generate custom questions using AI for any topic or based on your uploaded documents.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Create questions on any topic or enhance your uploaded documents with additional questions.
            Configure your AI providers in settings for best results.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic/Theme</Label>
            <Input
              id="topic"
              placeholder="e.g., Photosynthesis, World War II, Algebra basics..."
              value={config.topic}
              onChange={(e) => setConfig({ ...config, topic: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Select 
              value={config.subject_id} 
              onValueChange={(value) => setConfig({ ...config, subject_id: value })}
            >
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

          <div className="space-y-2">
            <Label>Class Level</Label>
            <Select 
              value={config.class_level} 
              onValueChange={(value) => setConfig({ ...config, class_level: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level.replace('grade_', 'Grade ')}
                  </SelectItem>
                ))}
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
                    <div>
                      <div className="font-medium">{diff.label}</div>
                      <div className="text-xs text-muted-foreground">{diff.description}</div>
                    </div>
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
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
        </div>

        {documents.length > 0 && (
          <div className="space-y-2">
            <Label>Base on Document (Optional)</Label>
            <Select 
              value={config.document_id} 
              onValueChange={(value) => setConfig({ ...config, document_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a document (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No document - topic only</SelectItem>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{doc.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {doc.subjects?.name}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
            disabled={isGenerating || !config.topic.trim() || !config.subject_id || !config.class_level}
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
    </div>
  );
};