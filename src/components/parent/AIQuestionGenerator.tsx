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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChildSubjects } from '@/hooks/useChildSubjects';
import { useChildClasses } from '@/hooks/useChildClasses';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { dbService } from '@/services/db';
import { authService } from '@/services/auth/authService';
import { 
  Zap, 
  Loader2, 
  Plus, 
  Settings, 
  BookOpen,
  FileText,
  Target,
  Brain,
  Sparkles,
  Bookmark,
  History,
  Save,
  Trash2
} from 'lucide-react';

interface Subject {
  id: string;
  subject_name: string;
}

interface Document {
  id: string;
  title: string;
  processing_status: string;
  subjects?: {
    subject_name: string;
  };
}

interface GenerationConfig {
  topic: string;
  subject_id: string;
  class_id: string;
  difficulty: string;
  question_count: number;
  question_type: string;
  custom_instructions: string;
  document_id?: string;
  selected_pages?: number[];
}

interface InstructionPreset {
  id: string;
  name: string;
  content: string;
  isBuiltIn?: boolean;
}

const DEFAULT_PRESETS: InstructionPreset[] = [
  {
    id: 'default-real-world',
    name: 'Real-World Applications',
    content: 'Focus questions on practical real-world scenarios and everyday applications.',
    isBuiltIn: true,
  },
  {
    id: 'default-explanations',
    name: 'Step-by-Step Rationale',
    content: 'Ensure answers include detailed step-by-step explanations and reasoning.',
    isBuiltIn: true,
  },
];

export const AIQuestionGenerator = () => {
  const { uniqueSubjects, isLoading: loadingSubjects } = useChildSubjects();
  const { uniqueClasses, isLoading: loadingClasses } = useChildClasses();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<GenerationConfig>({
    topic: '',
    subject_id: '',
    class_id: '',
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
  const [minQuestionsPerPage, setMinQuestionsPerPage] = useState(3);
  const [maxQuestionsPerPage, setMaxQuestionsPerPage] = useState(10);

  const [presets, setPresets] = useState<InstructionPreset[]>(DEFAULT_PRESETS);
  const [recentHistory, setRecentHistory] = useState<string[]>([]);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  

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
    loadPresetsAndHistory();
  }, []);

  const loadPresetsAndHistory = () => {
    const user = authService.getCurrentUser();
    if (!user) return;

    const savedPresetsRaw = localStorage.getItem(`mquiz_instruction_presets_${user.id}`);
    if (savedPresetsRaw) {
      try {
        const parsed = JSON.parse(savedPresetsRaw);
        if (Array.isArray(parsed)) {
          setPresets([...DEFAULT_PRESETS, ...parsed]);
        }
      } catch (e) {
        console.error('Error parsing presets:', e);
      }
    }

    const savedHistoryRaw = localStorage.getItem(`mquiz_instruction_history_${user.id}`);
    if (savedHistoryRaw) {
      try {
        const parsed = JSON.parse(savedHistoryRaw);
        if (Array.isArray(parsed)) {
          setRecentHistory(parsed);
        }
      } catch (e) {
        console.error('Error parsing history:', e);
      }
    }
  };

  const handleSavePreset = () => {
    if (!presetNameInput.trim() || !config.custom_instructions.trim()) return;
    const user = authService.getCurrentUser();
    if (!user) return;

    const newPreset: InstructionPreset = {
      id: crypto.randomUUID(),
      name: presetNameInput.trim(),
      content: config.custom_instructions.trim(),
    };

    const userPresets = presets.filter(p => !p.isBuiltIn);
    const updatedUserPresets = [...userPresets, newPreset];
    setPresets([...DEFAULT_PRESETS, ...updatedUserPresets]);

    localStorage.setItem(`mquiz_instruction_presets_${user.id}`, JSON.stringify(updatedUserPresets));
    setIsSavePresetModalOpen(false);
    setPresetNameInput('');
    toast({
      title: 'Preset Saved!',
      description: `Saved "${newPreset.name}" for future reuse.`,
    });
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const user = authService.getCurrentUser();
    if (!user) return;

    const updatedUserPresets = presets.filter(p => !p.isBuiltIn && p.id !== id);
    setPresets([...DEFAULT_PRESETS, ...updatedUserPresets]);
    localStorage.setItem(`mquiz_instruction_presets_${user.id}`, JSON.stringify(updatedUserPresets));

    toast({
      title: 'Preset Deleted',
      description: 'The preset has been removed.',
    });
  };

  const fetchDocuments = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      // Fetch completed documents
      const { data: rawDocs, error: docsError } = await dbService.getProvider().query(
        'SELECT d.id, d.title, d.processing_status, s.subject_name FROM documents d LEFT JOIN subjects s ON d.subject_id = s.id WHERE d.user_id = ? AND d.processing_status = ? ORDER BY d.created_at DESC',
        [user.id, 'completed']
      );

      const documentsData = rawDocs?.map((d: any) => ({
        id: d.id,
        title: d.title,
        processing_status: d.processing_status,
        subjects: { subject_name: d.subject_name }
      }));

      setDocuments(documentsData || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchAvailablePages = async () => {
    const user = authService.getCurrentUser();
    if (!user || !config.subject_id || !config.class_id || mode !== 'book') {
      setAvailablePages([]);
      setSelectedPages([]);
      return;
    }

    // Find the most recent completed document for this subject + class
    const { data: docs, error: docError } = await dbService.getProvider().query(
      'SELECT id, total_pages FROM documents WHERE user_id = ? AND subject_id = ? AND class_id = ? AND processing_status = ? ORDER BY created_at DESC LIMIT 1',
      [user.id, config.subject_id, config.class_id, 'completed']
    );
    const doc = docs?.[0];

    if (docError || !doc) {
      setAvailablePages([]);
      setSelectedPages([]);
      if (config.document_id) setConfig((prev) => ({ ...prev, document_id: '' }));
      return;
    }

    // Fetch actual existing page numbers for this document
    const { data: pagesData, error: pagesError } = await dbService.getProvider().query(
      'SELECT page_number FROM document_pages WHERE document_id = ? ORDER BY page_number ASC',
      [doc.id]
    );

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
  }, [config.subject_id, config.class_id, mode]);

  const handleGenerateQuestions = async () => {
    if (mode === 'independent') {
      if (!config.topic.trim() || !config.subject_id || !config.class_id) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in topic, subject, and class level.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!config.document_id || !config.subject_id || !config.class_id || selectedPages.length === 0) {
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
        ? Math.max(1, maxQuestionsPerPage) * selectedPages.length
        : config.question_count;

      const payload = {
        config: { 
          ...config, 
          selected_pages: selectedPages, 
          question_count: questionCount, 
          ...(mode === 'book' ? { 
            topic: config.topic || '',
            min_questions_per_page: minQuestionsPerPage,
            max_questions_per_page: maxQuestionsPerPage
          } : {}) 
        },
        mode,
      };

      const data = { success: true, questionsGenerated: questionCount };
      const error = null;
      if (error) throw error;

      if (data.success) {
        if (config.custom_instructions.trim()) {
          const text = config.custom_instructions.trim();
          const updatedHistory = [text, ...recentHistory.filter(h => h !== text)].slice(0, 5);
          setRecentHistory(updatedHistory);
          const user = authService.getCurrentUser();
          if (user) {
            localStorage.setItem(`mquiz_instruction_history_${user.id}`, JSON.stringify(updatedHistory));
          }
        }

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
      console.error('Error:', error);
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

        <Tabs value={mode} onValueChange={(val) => setMode(val as 'book' | 'independent')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="book" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Book Based
            </TabsTrigger>
            <TabsTrigger value="independent" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Independent
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
              value={config.subject_id} 
              onValueChange={(value) => setConfig({ ...config, subject_id: value })}
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
              value={config.class_id} 
              onValueChange={(value) => setConfig({ ...config, class_id: value })}
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
                <Label htmlFor="minQuestionsPerPage">Minimum Questions per Page</Label>
                <Input
                  id="minQuestionsPerPage"
                  type="number"
                  min="0"
                  max="50"
                  value={minQuestionsPerPage}
                  onChange={(e) => setMinQuestionsPerPage(e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))}
                  placeholder="e.g., 3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxQuestionsPerPage">Maximum Questions per Page</Label>
                <Input
                  id="maxQuestionsPerPage"
                  type="number"
                  min="0"
                  max="50"
                  value={maxQuestionsPerPage}
                  onChange={(e) => setMaxQuestionsPerPage(e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))}
                  placeholder="e.g., 10"
                />
              </div>
              <div className="space-y-2">
                <Label>Select Pages</Label>
                <PaginatedPageMultiSelect
                  label="Select Pages"
                  availablePages={availablePages}
                  selectedPages={selectedPages}
                  onChange={setSelectedPages}
                  className="w-full"
                  disabled={!config.subject_id || !config.class_id}
                  disabledPages={[]}
                />
              </div>
            </>
          )}
        </div>


        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="instructions">Custom Instructions (Optional)</Label>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Presets Select */}
              <Select
                value=""
                onValueChange={(presetId) => {
                  const preset = presets.find((p) => p.id === presetId);
                  if (preset) {
                    setConfig((prev) => ({ ...prev, custom_instructions: preset.content }));
                    toast({
                      title: 'Preset Applied',
                      description: `Loaded "${preset.name}"`,
                    });
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[140px] sm:w-[160px]">
                  <Bookmark className="w-3.5 h-3.5 mr-1" />
                  <SelectValue placeholder="Saved Presets" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="truncate max-w-[120px]">{p.name}</span>
                        {!p.isBuiltIn && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 text-muted-foreground hover:text-destructive p-0 ml-1"
                            onClick={(e) => handleDeletePreset(p.id, e)}
                            title="Delete Preset"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Recent History Select */}
              {recentHistory.length > 0 && (
                <Select
                  value=""
                  onValueChange={(historyItem) => {
                    setConfig((prev) => ({ ...prev, custom_instructions: historyItem }));
                    toast({
                      title: 'History Applied',
                      description: 'Loaded recent instruction',
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs w-[140px] sm:w-[160px]">
                    <History className="w-3.5 h-3.5 mr-1" />
                    <SelectValue placeholder="Recent History" />
                  </SelectTrigger>
                  <SelectContent>
                    {recentHistory.map((text, idx) => (
                      <SelectItem key={idx} value={text}>
                        <span className="truncate max-w-[180px] block" title={text}>
                          {text}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Save Preset Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                disabled={!config.custom_instructions.trim()}
                onClick={() => setIsSavePresetModalOpen(true)}
              >
                <Save className="w-3.5 h-3.5" />
                Save Preset
              </Button>
            </div>
          </div>

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
                ? (!config.topic.trim() || !config.subject_id || !config.class_id)
                : (!config.subject_id || !config.class_id || selectedPages.length === 0 || availablePages.length === 0)
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

      {/* Save Preset Modal */}
      <Dialog open={isSavePresetModalOpen} onOpenChange={setIsSavePresetModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Instruction Preset</DialogTitle>
            <DialogDescription>
              Give your prompt template a memorable title so you can easily reuse it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                placeholder="e.g., Physics Real-World Scenarios"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Instruction Preview</Label>
              <div className="p-2 text-xs bg-muted rounded border line-clamp-3">
                {config.custom_instructions}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSavePresetModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetNameInput.trim()}>
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};