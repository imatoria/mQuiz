import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TestScheduler } from './TestScheduler';

export const ScheduleManager = () => {
  const [scheduledTests, setScheduledTests] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchScheduledTests();
  }, [refreshKey]);

  const fetchScheduledTests = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: testsData } = await supabase
      .from('scheduled_tests')
      .select(`
        *,
        question_papers(title, subjects(name))
      `)
      .eq('creator_id', user.user.id)
      .order('created_at', { ascending: false });

    setScheduledTests(testsData || []);
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <TestScheduler onTestScheduled={handleRefresh} />

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Tests</CardTitle>
          <CardDescription>Your upcoming and past tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scheduledTests.slice(0, 5).map((test) => (
              <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{test.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {test.question_papers?.subjects?.name} • {new Date(test.start_time).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={new Date(test.end_time) > new Date() ? 'default' : 'secondary'}>
                  {new Date(test.end_time) > new Date() ? 'Active' : 'Completed'}
                </Badge>
              </div>
            ))}
            {scheduledTests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No tests scheduled yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
