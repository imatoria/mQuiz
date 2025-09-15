import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  FileText, 
  Calendar as CalendarIcon, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface Subject {
  id: string;
  name: string;
}

interface PaperFormData {
  title: string;
  subject_id: string;
  class_level: string;
  total_questions: number;
  time_limit_minutes: number;
  is_scheduled: boolean;
  start_time?: Date;
  end_time?: Date;
  max_attempts: number;
  assign_to_all: boolean;
}

export const UnifiedPaperCreator = () => {
  const [formData, setFormData] = useState<PaperFormData>({
    title: '',
    subject_id: '',
    class_level: '',
    total_questions: 10,
    time_limit_minutes: 60,
    is_scheduled: false,
    max_attempts: 1,
    assign_to_all: true
  });
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { user } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.subject_id) newErrors.subject_id = 'Subject is required';
    if (!formData.class_level) newErrors.class_level = 'Class level is required';
    
    if (formData.is_scheduled) {
      if (!formData.start_time) newErrors.start_time = 'Start time is required';
      if (!formData.end_time) newErrors.end_time = 'End time is required';
      if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
        newErrors.end_time = 'End time must be after start time';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const paperData = {
        title: formData.title,
        subject_id: formData.subject_id,
        class_level: formData.class_level as "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12",
        total_questions: formData.total_questions,
        time_limit_minutes: formData.time_limit_minutes,
        user_id: user?.id,
        is_scheduled: formData.is_scheduled,
        start_time: formData.is_scheduled ? formData.start_time?.toISOString() : null,
        end_time: formData.is_scheduled ? formData.end_time?.toISOString() : null,
        max_attempts: formData.max_attempts,
        assign_to_all: formData.assign_to_all
      };
      
      const { error } = await supabase
        .from('question_papers')
        .insert(paperData);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: formData.is_scheduled 
          ? "Paper created and scheduled successfully!" 
          : "Paper created successfully!",
        variant: "default"
      });
      
      // Reset form
      setFormData({
        title: '',
        subject_id: '',
        class_level: '',
        total_questions: 10,
        time_limit_minutes: 60,
        is_scheduled: false,
        max_attempts: 1,
        assign_to_all: true
      });
      
    } catch (error) {
      console.error('Error creating paper:', error);
      toast({
        title: "Error",
        description: "Failed to create paper",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Create Question Paper
        </CardTitle>
        <CardDescription>
          Create a new question paper with optional test scheduling
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="scheduling">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Test Scheduling
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Paper Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter paper title"
                  className={cn(errors.title && "border-destructive")}
                />
                {errors.title && (
                  <p className="text-sm text-destructive flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.title}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Select 
                    value={formData.subject_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subject_id: value }))}
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
                  <Label>Class Level *</Label>
                  <Select 
                    value={formData.class_level} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, class_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                        <SelectItem key={grade} value={grade.toString()}>
                          Grade {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="scheduling" className="space-y-4">
              <div className="flex items-center space-x-3">
                <Switch
                  checked={formData.is_scheduled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_scheduled: checked }))}
                />
                <Label>Schedule as Test</Label>
              </div>
              
              {formData.is_scheduled && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.start_time ? format(formData.start_time, "PPP") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.start_time}
                            onSelect={(date) => setFormData(prev => ({ ...prev, start_time: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>End Time *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.end_time ? format(formData.end_time, "PPP") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.end_time}
                            onSelect={(date) => setFormData(prev => ({ ...prev, end_time: date }))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline">Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>Creating...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {formData.is_scheduled ? 'Create & Schedule' : 'Create Paper'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};