import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Eye, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  MessageSquare,
  User,
  Calendar
} from 'lucide-react';

interface PendingResult {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  student: {
    id: string;
    full_name: string;
    email: string;
  };
  test: {
    title: string;
    subject: string;
  };
  answers: Record<string, string>;
}

export const ResultApproval = () => {
  const [pendingResults, setPendingResults] = useState<PendingResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<PendingResult | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.role === 'parent') {
      loadPendingResults();
    }
  }, [profile]);

  const loadPendingResults = async () => {
    try {
      setLoading(true);

      // Get children of the current parent
      const { data: children, error: childrenError } = await supabase
        .from('parent_child_relationships')
        .select('child_id')
        .eq('parent_id', user?.id);

      if (childrenError) throw childrenError;

      const childIds = children?.map(c => c.child_id) || [];

      if (childIds.length === 0) {
        setPendingResults([]);
        setLoading(false);
        return;
      }

      // Get test attempts that need approval
      const { data: attempts, error: attemptsError } = await supabase
        .from('test_attempts')
        .select(`
          id,
          score,
          total_questions,
          completed_at,
          answers,
          approval_status,
          feedback,
          user_id,
          scheduled_test:scheduled_tests (
            title,
            question_papers (
              subjects (name)
            )
          )
        `)
        .in('user_id', childIds)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Get user profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', childIds);

      if (profilesError) throw profilesError;

      const profileMap = profiles?.reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};

      const formatted: PendingResult[] = attempts?.map(attempt => ({
        id: attempt.id,
        score: attempt.score || 0,
        total_questions: attempt.total_questions || 0,
        completed_at: attempt.completed_at,
        status: (attempt.approval_status as 'pending' | 'approved' | 'rejected') || 'pending',
        feedback: attempt.feedback,
        answers: (attempt.answers as Record<string, string>) || {},
        student: {
          id: attempt.user_id,
          full_name: profileMap[attempt.user_id]?.full_name || 'Unknown',
          email: profileMap[attempt.user_id]?.email || ''
        },
        test: {
          title: attempt.scheduled_test?.title || 'Unknown Test',
          subject: attempt.scheduled_test?.question_papers?.subjects?.name || 'Unknown Subject'
        }
      })) || [];

      setPendingResults(formatted);

    } catch (error) {
      console.error('Error loading pending results:', error);
      toast({
        title: "Error",
        description: "Failed to load pending results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (resultId: string, status: 'approved' | 'rejected', feedbackText?: string) => {
    try {
      setProcessing(true);

      const { error } = await supabase
        .from('test_attempts')
        .update({
          approval_status: status,
          feedback: feedbackText || null,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
          approved_by: user?.id
        })
        .eq('id', resultId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Result ${status} successfully`,
        variant: "default"
      });

      // Refresh the list
      loadPendingResults();
      setSelectedResult(null);
      setFeedback('');

    } catch (error) {
      console.error('Error updating approval status:', error);
      toast({
        title: "Error",
        description: "Failed to update approval status",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="w-3 h-3" />;
      case 'rejected': return <X className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Show loading state while profile is being fetched
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  // Only check access after loading is complete
  if (profile?.role !== 'parent') {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            Result approval is only available for parents/teachers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Result Approval</h2>
        <p className="text-muted-foreground">
          Review and approve test results before showing them to students
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingResults.filter(r => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingResults.filter(r => r.status === 'approved').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingResults.filter(r => r.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results Awaiting Review</CardTitle>
          <CardDescription>Click on a result to review and approve</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{result.student.full_name}</div>
                        <div className="text-sm text-muted-foreground">{result.student.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{result.test.title}</div>
                      <div className="text-sm text-muted-foreground">{result.test.subject}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-bold ${getScoreColor(result.score)}`}>
                      {result.score}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round((result.score / 100) * result.total_questions)}/{result.total_questions} correct
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(result.completed_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(result.status)} flex items-center space-x-1`}>
                      {getStatusIcon(result.status)}
                      <span className="capitalize">{result.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedResult(result)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Review Test Result</DialogTitle>
                            <DialogDescription>
                              {result.student.full_name} - {result.test.title}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <Card>
                                <CardContent className="pt-4">
                                  <div className="text-center">
                                    <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                                      {result.score}%
                                    </div>
                                    <p className="text-sm text-muted-foreground">Final Score</p>
                                  </div>
                                </CardContent>
                              </Card>
                              
                              <Card>
                                <CardContent className="pt-4">
                                  <div className="text-center">
                                    <div className="text-3xl font-bold">
                                      {Math.round((result.score / 100) * result.total_questions)}/{result.total_questions}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Correct Answers</p>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">Feedback (Optional)</label>
                              <Textarea
                                placeholder="Add feedback for the student..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => handleApproval(result.id, 'rejected', feedback)}
                                disabled={processing}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                              <Button
                                onClick={() => handleApproval(result.id, 'approved', feedback)}
                                disabled={processing}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {result.status === 'pending' && (
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproval(result.id, 'approved')}
                            disabled={processing}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproval(result.id, 'rejected')}
                            disabled={processing}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pendingResults.length === 0 && (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results to Review</h3>
              <p className="text-muted-foreground">
                All test results have been reviewed and processed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};