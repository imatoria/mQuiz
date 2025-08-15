import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2 } from 'lucide-react';
import { QuestionPaperGenerator } from './QuestionPaperGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const PapersManager: React.FC = () => {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [questionPapers, setQuestionPapers] = React.useState<any[]>([]);
  const [selectedPaper, setSelectedPaper] = React.useState<any | null>(null);
  const [paperQuestions, setPaperQuestions] = React.useState<any[]>([]);
  const [isQuestionsOpen, setIsQuestionsOpen] = React.useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = React.useState(false);
  const [editingQuestion, setEditingQuestion] = React.useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchPapers = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: papersData } = await supabase
        .from('question_papers')
        .select(`
          *,
          subjects(name)
        `)
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      setQuestionPapers(papersData || []);
    };

    fetchPapers();
  }, [refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const fetchPaperQuestions = async (paperId: string) => {
    setIsLoadingQuestions(true);
    try {
      const { data: links, error: linkErr } = await supabase
        .from('question_paper_questions')
        .select('question_id, question_order')
        .eq('question_paper_id', paperId)
        .order('question_order', { ascending: true });
      if (linkErr) throw linkErr;

      const ids = (links || []).map((l: any) => l.question_id);
      if (ids.length === 0) {
        setPaperQuestions([]);
        return;
      }

      const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .in('id', ids);
      if (qErr) throw qErr;

      const ordered = (links || []).map((link: any) => (questions || []).find((q: any) => q.id === link.question_id)).filter(Boolean);
      setPaperQuestions(ordered as any[]);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load questions for this paper.', variant: 'destructive' });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const openPaper = async (paper: any) => {
    setSelectedPaper(paper);
    setIsQuestionsOpen(true);
    await fetchPaperQuestions(paper.id);
  };

  const handleEditQuestion = (q: any) => {
    setEditingQuestion(q);
    setIsEditDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          question_text: editingQuestion.question_text,
          option_a: editingQuestion.option_a,
          option_b: editingQuestion.option_b,
          option_c: editingQuestion.option_c,
          option_d: editingQuestion.option_d,
          correct_answer: editingQuestion.correct_answer,
          difficulty: editingQuestion.difficulty,
        })
        .eq('id', editingQuestion.id);
      if (error) throw error;

      toast({ title: 'Saved', description: 'Question updated successfully.' });
      setPaperQuestions((prev) => prev.map((q) => (q.id === editingQuestion.id ? editingQuestion : q)));
      setIsEditDialogOpen(false);
      setEditingQuestion(null);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to update question.', variant: 'destructive' });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedPaper) return;
    if (!confirm('Delete this question? This will remove it from all papers.')) return;
    try {
      const { error: linkDelErr } = await supabase
        .from('question_paper_questions')
        .delete()
        .eq('question_id', questionId);
      if (linkDelErr) throw linkDelErr;

      const { error: delErr } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);
      if (delErr) throw delErr;

      setPaperQuestions((prev) => prev.filter((q) => q.id !== questionId));
      toast({ title: 'Deleted', description: 'Question deleted.' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to delete question.', variant: 'destructive' });
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <QuestionPaperGenerator onPaperGenerated={handleRefresh} />

      <Card>
        <CardHeader>
          <CardTitle>Recent Question Papers</CardTitle>
          <CardDescription>
            Your generated question papers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questionPapers.slice(0, 5).map((paper) => (
              <div
                key={paper.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => openPaper(paper)}
              >
                <div>
                  <p className="font-medium text-sm">{paper.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {paper.subjects?.name} - Class {paper.class_level} • {paper.total_questions} questions
                  </p>
                </div>
                <Badge variant="outline">View</Badge>
              </div>
            ))}
            {questionPapers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No question papers generated yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isQuestionsOpen} onOpenChange={setIsQuestionsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPaper?.title || 'Question Paper'}</DialogTitle>
            <DialogDescription>
              {selectedPaper ? `${selectedPaper.total_questions} questions` : ''}
            </DialogDescription>
          </DialogHeader>

          {isLoadingQuestions ? (
            <div className="py-6 text-center text-muted-foreground">Loading questions...</div>
          ) : paperQuestions.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">No questions in this paper.</div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paperQuestions.map((q: any, idx: number) => (
                    <TableRow key={q.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={q.question_text}>{q.question_text}</div>
                      </TableCell>
                      <TableCell>{q.difficulty}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditQuestion(q)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteQuestion(q.id)}>
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
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Modify the question details below.</DialogDescription>
          </DialogHeader>

          {editingQuestion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question_text">Question</Label>
                <Textarea
                  id="question_text"
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="option_a">Option A</Label>
                  <Input id="option_a" value={editingQuestion.option_a} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="option_b">Option B</Label>
                  <Input id="option_b" value={editingQuestion.option_b} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="option_c">Option C</Label>
                  <Input id="option_c" value={editingQuestion.option_c} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_c: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="option_d">Option D</Label>
                  <Input id="option_d" value={editingQuestion.option_d} onChange={(e) => setEditingQuestion({ ...editingQuestion, option_d: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <Select value={editingQuestion.correct_answer} onValueChange={(v: any) => setEditingQuestion({ ...editingQuestion, correct_answer: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Select value={editingQuestion.difficulty} onValueChange={(v: any) => setEditingQuestion({ ...editingQuestion, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="difficult">Difficult</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveQuestion}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
