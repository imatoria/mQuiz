import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuestionPaperGenerator } from './QuestionPaperGenerator';
import { supabase } from '@/integrations/supabase/client';

export const PapersManager: React.FC = () => {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [questionPapers, setQuestionPapers] = React.useState<any[]>([]);

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
              <div key={paper.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{paper.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {paper.subjects?.name} - Class {paper.class_level} • {paper.total_questions} questions
                  </p>
                </div>
                <Badge variant="outline">Ready</Badge>
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
    </div>
  );
};
