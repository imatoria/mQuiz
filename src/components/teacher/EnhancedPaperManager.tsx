import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { dbService } from '@/services/db';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  FileText, 
  Calendar, 
  Clock, 
  Users, 
  MoreHorizontal,
  Eye,
  Calendar as CalendarIcon,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer
} from 'lucide-react';

interface QuestionPaper {
  id: string;
  title: string;
  total_questions: number;
  time_limit_minutes: number;
  class_id: string;
  subject_id: string;
  created_at: string;
  updated_at: string;
  start_time?: string;
  end_time?: string;
  max_attempts: number;
  assign_to_all: boolean;
  subjects: { subject_name: string };
  paper_attempts: Array<{
    id: string;
    user_id: string;
    completed_at: string | null;
    score: number | null;
  }>;
}

type PaperStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'expired';

export const EnhancedPaperManager = () => {
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<QuestionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadPapers();
    }
  }, [user]);

  useEffect(() => {
    filterPapers();
  }, [papers, searchTerm, statusFilter]);

  const loadPapers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await dbService.getProvider().query(`
        SELECT 
          qp.*,
          s.subject_name
        FROM question_papers qp
        LEFT JOIN subjects s ON qp.subject_id = s.id
        WHERE qp.user_id = ?
        ORDER BY qp.updated_at DESC
      `, [user?.id]);
      
      if (error) throw error;
      
      const formattedData = await Promise.all((data || []).map(async (paper: any) => {
        const { data: attempts } = await dbService.getProvider().query(`
          SELECT id, user_id, completed_at, score 
          FROM paper_attempts 
          WHERE question_paper_id = ?
        `, [paper.id]);
        
        return {
          ...paper,
          subjects: { subject_name: paper.subject_name },
          paper_attempts: attempts || []
        };
      }));
      
      setPapers(formattedData || []);
    } catch (error) {
      console.error('Error loading papers:', error);
      toast({
        title: "Error",
        description: "Failed to load papers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPapers = () => {
    let filtered = papers;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(paper => 
        paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        paper.subjects.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(paper => getPaperStatus(paper) === statusFilter);
    }
    
    setFilteredPapers(filtered);
  };

  const getPaperStatus = (paper: QuestionPaper): PaperStatus => {
    if (!paper.start_time || !paper.end_time) {
      return 'draft';
    }
    
    const now = new Date();
    const startTime = new Date(paper.start_time);
    const endTime = new Date(paper.end_time);
    
    if (endTime && now > endTime) {
      return 'expired';
    }
    
    if (startTime && endTime) {
      if (now < startTime) {
        return 'scheduled';
      } else if (now >= startTime && now <= endTime) {
        return 'active';
      }
    }
    
    // Check if all attempts are completed
    const totalAttempts = paper.paper_attempts.length;
    const completedAttempts = paper.paper_attempts.filter(a => a.completed_at).length;
    
    if (totalAttempts > 0 && completedAttempts === totalAttempts) {
      return 'completed';
    }
    
    return 'active';
  };

  const getStatusBadge = (status: PaperStatus) => {
    const variants = {
      draft: { variant: 'secondary' as const, label: 'Draft', icon: FileText },
      scheduled: { variant: 'outline' as const, label: 'Scheduled', icon: Calendar },
      active: { variant: 'default' as const, label: 'Active', icon: Play },
      completed: { variant: 'success' as const, label: 'Completed', icon: CheckCircle2 },
      expired: { variant: 'destructive' as const, label: 'Expired', icon: XCircle }
    };
    
    const config = variants[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleDeletePaper = async () => {
    if (!selectedPaper) return;
    
    try {
      // Check if paper has attempts
      if (selectedPaper.paper_attempts.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "Cannot delete a paper that has student attempts",
          variant: "destructive"
        });
        setShowDeleteDialog(false);
        setSelectedPaper(null);
        return;
      }
      
      const { error } = await dbService.getProvider().execute(
        'DELETE FROM question_papers WHERE id = ?',
        [selectedPaper.id]
      );
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Paper deleted successfully",
        variant: "default"
      });
      
      loadPapers();
    } catch (error) {
      console.error('Error deleting paper:', error);
      toast({
        title: "Error",
        description: "Failed to delete paper",
        variant: "destructive"
      });
    } finally {
      setShowDeleteDialog(false);
      setSelectedPaper(null);
    }
  };

  const getAttemptStats = (paper: QuestionPaper) => {
    const total = paper.paper_attempts.length;
    const completed = paper.paper_attempts.filter(a => a.completed_at).length;
    const inProgress = total - completed;
    const avgScore = completed > 0 
      ? Math.round(paper.paper_attempts
          .filter(a => a.completed_at && a.score !== null)
          .reduce((sum, a) => sum + (a.score || 0), 0) / completed)
      : 0;
    
    return { total, completed, inProgress, avgScore };
  };

  const formatTimeRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Paper Management</h2>
          <p className="text-muted-foreground">Manage your question papers and test schedules</p>
        </div>
        <Button onClick={() => window.location.href = '/create-paper'}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Paper
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search papers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Papers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Question Papers ({filteredPapers.length})</CardTitle>
          <CardDescription>
            Overview of all your question papers and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPapers.map((paper, index) => {
                  const status = getPaperStatus(paper);
                  const stats = getAttemptStats(paper);
                  
                  return (
                    <TableRow key={`${paper.id}-${index}`}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{paper.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {paper.subjects.subject_name} • {paper.total_questions} questions
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {paper.time_limit_minutes} min
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(status)}
                      </TableCell>
                      
                      <TableCell>
                        {paper.start_time && paper.end_time ? (
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Start:</span> {format(new Date(paper.start_time), 'MMM d, HH:mm')}
                            </div>
                            {paper.end_time && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">End:</span> {format(new Date(paper.end_time), 'MMM d, HH:mm')}
                              </div>
                            )}
                            {status === 'active' && paper.end_time && (
                              <div className="text-xs text-orange-600 flex items-center">
                                <Timer className="w-3 h-3 mr-1" />
                                {formatTimeRemaining(paper.end_time)} left
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">{stats.completed}</span> completed
                          </div>
                          {stats.inProgress > 0 && (
                            <div className="text-sm text-orange-600">
                              {stats.inProgress} in progress
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Max {paper.max_attempts} attempts
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {stats.completed > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {stats.avgScore}% avg
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {stats.completed} submissions
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No data</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asStudent>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.location.href = `/papers/${paper.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `/papers/${paper.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Paper
                            </DropdownMenuItem>
                            {paper.start_time && paper.end_time && (
                              <DropdownMenuItem onClick={() => window.location.href = `/papers/${paper.id}/schedule`}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                Edit Schedule
                              </DropdownMenuItem>
                            )}
                            {(!paper.start_time || !paper.end_time) && (
                              <DropdownMenuItem onClick={() => window.location.href = `/papers/${paper.id}/schedule`}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Schedule Test
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => window.location.href = `/papers/${paper.id}/results`}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              View Results
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedPaper(paper);
                                setShowDeleteDialog(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {filteredPapers.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Papers Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No papers match your current filters' 
                    : 'Create your first question paper to get started'
                  }
                </p>
                <Button onClick={() => window.location.href = '/create-paper'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Paper
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Paper</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPaper?.title}"? This action cannot be undone.
              {selectedPaper?.paper_attempts.length > 0 && (
                <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
                  <p className="text-destructive text-sm font-medium">
                    This paper has {selectedPaper.paper_attempts.length} student attempt(s) and cannot be deleted.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePaper}
              disabled={selectedPaper?.paper_attempts.length > 0}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};