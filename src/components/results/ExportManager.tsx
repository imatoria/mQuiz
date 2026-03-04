import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { 
  Download, 
  FileText, 
  Table, 
  Calendar as CalendarIcon,
  Filter,
  LoaderCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportData {
  student_name: string;
  test_title: string;
  score: number;
  total_questions: number;
  percentage: number;
  completed_at: string;
  time_taken: number;
  subject: string;
  class_level: string;
}

export const ExportManager = () => {
  const [exportData, setExportData] = useState<ExportData[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [testList, setTestList] = useState<any[]>([]);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch students
      if (profile?.role === 'parent') {
        const { data: children } = await supabase
          .from('parent_child_relationships')
          .select(`
            child_id,
            profiles!parent_child_relationships_child_id_fkey(
              full_name,
              user_id
            )
          `)
          .eq('parent_id', profile.user_id);
        
        setStudentList(children || []);
      }

      // Fetch tests
      let testQuery = supabase
        .from('question_papers')
        .select('id, title, user_id');

      if (profile?.role === 'parent') {
        testQuery = testQuery.eq('user_id', profile.user_id);
      }

      const { data: tests } = await testQuery;
      setTestList(tests || []);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    }
  };

  const fetchExportData = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('paper_attempts')
        .select(`
          *,
          question_papers!inner(
            title,
            user_id,
            class_parent_id,
            subject_parent_id,
            classes_parent(class_name),
            subjects_parent(subject_name)
          ),
          profiles!paper_attempts_user_id_fkey(
            full_name,
            user_id
          )
        `)
        .not('completed_at', 'is', null);

      // Apply filters
      if (profile?.role === 'parent') {
        query = query.eq('question_papers.user_id', profile.user_id);
      } else if (profile?.role === 'child') {
        query = query.eq('user_id', profile.user_id);
      }

      if (selectedStudents.length > 0) {
        query = query.in('user_id', selectedStudents);
      }

      if (selectedTests.length > 0) {
        query = query.in('paper_id', selectedTests);
      }

      if (dateRange?.from) {
        query = query.gte('completed_at', dateRange.from.toISOString());
      }

      if (dateRange?.to) {
        query = query.lte('completed_at', dateRange.to.toISOString());
      }

      const { data: attempts, error } = await query;

      if (error) throw error;

      // Transform data for export
      const exportData: ExportData[] = attempts?.map((attempt: any) => ({
        student_name: attempt.profiles?.full_name || 'Unknown Student',
        test_title: attempt.question_papers.title,
        score: attempt.score || 0,
        total_questions: attempt.total_questions || 0,
        percentage: attempt.total_questions > 0 
          ? Math.round((attempt.score / attempt.total_questions) * 100) 
          : 0,
        completed_at: format(new Date(attempt.completed_at), 'dd/MM/yyyy HH:mm'),
        time_taken: attempt.completed_at && attempt.started_at 
          ? Math.round((new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime()) / 60000)
          : 0,
        subject: attempt.question_papers.subjects_parent?.subject_name || 'Unknown',
        class_level: attempt.question_papers.classes_parent?.class_name || 'Unknown'
      })) || [];

      setExportData(exportData);
      return exportData;

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch export data",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async (data: ExportData[]) => {
    try {
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      // Add title
      pdf.setFontSize(20);
      pdf.text('Test Results Report', 20, 20);
      
      // Add filters info
      pdf.setFontSize(12);
      let yPos = 35;
      
      if (dateRange?.from || dateRange?.to) {
        const fromDate = dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : 'N/A';
        const toDate = dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : 'N/A';
        pdf.text(`Date Range: ${fromDate} - ${toDate}`, 20, yPos);
        yPos += 10;
      }
      
      pdf.text(`Total Records: ${data.length}`, 20, yPos);
      yPos += 15;

      // Create table headers
      const headers = [
        'Student', 'Test', 'Score', 'Total', '%', 'Completed', 'Time (min)', 'Subject', 'Class'
      ];
      
      // Calculate column widths
      const colWidths = [35, 40, 20, 20, 15, 35, 25, 30, 20];
      let xPos = 20;
      
      // Draw headers
      pdf.setFillColor(59, 130, 246); // Primary color
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      
      headers.forEach((header, index) => {
        pdf.rect(xPos, yPos, colWidths[index], 8, 'F');
        pdf.text(header, xPos + 2, yPos + 6);
        xPos += colWidths[index];
      });
      
      // Draw data rows
      pdf.setTextColor(0, 0, 0);
      yPos += 8;
      
      data.forEach((row, rowIndex) => {
        if (yPos > 180) { // Check if we need a new page
          pdf.addPage();
          yPos = 20;
        }
        
        xPos = 20;
        const values = [
          row.student_name.substring(0, 20),
          row.test_title.substring(0, 25),
          row.score.toString(),
          row.total_questions.toString(),
          row.percentage.toString(),
          row.completed_at,
          row.time_taken.toString(),
          row.subject.substring(0, 18),
          row.class_level
        ];
        
        values.forEach((value, index) => {
          // Alternate row colors
          if (rowIndex % 2 === 0) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(xPos, yPos, colWidths[index], 6, 'F');
          }
          
          pdf.text(value, xPos + 2, yPos + 4);
          xPos += colWidths[index];
        });
        
        yPos += 6;
      });

      // Add summary statistics
      if (data.length > 0) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text('Summary Statistics', 20, 20);
        
        pdf.setFontSize(12);
        const avgScore = data.reduce((sum, row) => sum + row.percentage, 0) / data.length;
        const completionRate = (data.length / data.length) * 100; // All data is completed tests
        
        pdf.text(`Average Score: ${avgScore.toFixed(1)}%`, 20, 40);
        pdf.text(`Total Tests Completed: ${data.length}`, 20, 50);
        pdf.text(`Completion Rate: ${completionRate}%`, 20, 60);
      }
      
      // Save the PDF
      const fileName = `test-results-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "Success",
        description: "PDF report generated successfully",
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  const exportToExcel = async (data: ExportData[]) => {
    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Main data sheet
      const ws = XLSX.utils.json_to_sheet(data.map(row => ({
        'Student Name': row.student_name,
        'Test Title': row.test_title,
        'Score': row.score,
        'Total Questions': row.total_questions,
        'Percentage': row.percentage,
        'Completed At': row.completed_at,
        'Time Taken (minutes)': row.time_taken,
        'Subject': row.subject,
        'Class Level': row.class_level
      })));
      
      XLSX.utils.book_append_sheet(wb, ws, 'Test Results');
      
      // Summary sheet
      if (data.length > 0) {
        const avgScore = data.reduce((sum, row) => sum + row.percentage, 0) / data.length;
        const subjectStats = data.reduce((acc, row) => {
          if (!acc[row.subject]) {
            acc[row.subject] = { count: 0, totalScore: 0 };
          }
          acc[row.subject].count++;
          acc[row.subject].totalScore += row.percentage;
          return acc;
        }, {} as Record<string, { count: number; totalScore: number }>);
        
        const summaryData = [
          { Metric: 'Total Tests', Value: data.length },
          { Metric: 'Average Score (%)', Value: avgScore.toFixed(1) },
          { Metric: 'Highest Score (%)', Value: Math.max(...data.map(r => r.percentage)) },
          { Metric: 'Lowest Score (%)', Value: Math.min(...data.map(r => r.percentage)) },
          {},
          { Metric: 'Subject Statistics', Value: '' },
          ...Object.entries(subjectStats).map(([subject, stats]) => ({
            Metric: `${subject} - Average`,
            Value: (stats.totalScore / stats.count).toFixed(1) + '%'
          }))
        ];
        
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
      }
      
      // Save the file
      const fileName = `test-results-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: "Success",
        description: "Excel report generated successfully",
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate Excel file",
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    const data = await fetchExportData();
    
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available for the selected filters",
        variant: "destructive"
      });
      return;
    }

    if (exportFormat === 'pdf') {
      await exportToPDF(data);
    } else {
      await exportToExcel(data);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
          <CardDescription>
            Configure your export settings and filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Format */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={(value: 'pdf' | 'excel') => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF Report
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    Excel Spreadsheet
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Select date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Student Selection */}
          {profile?.role === 'parent' && studentList.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Students</label>
              <div className="space-y-2">
                {studentList.map((student) => (
                  <div key={student.child_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={student.child_id}
                      checked={selectedStudents.includes(student.child_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudents([...selectedStudents, student.child_id]);
                        } else {
                          setSelectedStudents(selectedStudents.filter(id => id !== student.child_id));
                        }
                      }}
                    />
                    <label htmlFor={student.child_id} className="text-sm">
                      {student.profiles?.full_name || 'Unknown Student'}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test Selection */}
          {testList.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tests</label>
              <div className="space-y-2">
                {testList.map((test) => (
                  <div key={test.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={test.id}
                      checked={selectedTests.includes(test.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTests([...selectedTests, test.id]);
                        } else {
                          setSelectedTests(selectedTests.filter(id => id !== test.id));
                        }
                      }}
                    />
                    <label htmlFor={test.id} className="text-sm">
                      {test.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Options</label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-charts"
                checked={includeCharts}
                onCheckedChange={(checked) => setIncludeCharts(checked === true)}
              />
              <label htmlFor="include-charts" className="text-sm">
                Include charts and graphs (PDF only)
              </label>
            </div>
          </div>

          {/* Export Button */}
          <Button 
            onClick={handleExport} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export {exportFormat.toUpperCase()}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {exportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>
              Preview of data to be exported ({exportData.length} records)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Student</th>
                    <th className="text-left p-2">Test</th>
                    <th className="text-left p-2">Score</th>
                    <th className="text-left p-2">%</th>
                    <th className="text-left p-2">Completed</th>
                    <th className="text-left p-2">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {exportData.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{row.student_name}</td>
                      <td className="p-2">{row.test_title}</td>
                      <td className="p-2">{row.score}/{row.total_questions}</td>
                      <td className="p-2">{row.percentage}%</td>
                      <td className="p-2">{row.completed_at}</td>
                      <td className="p-2">{row.subject}</td>
                    </tr>
                  ))}
                  {exportData.length > 5 && (
                    <tr>
                      <td colSpan={6} className="p-2 text-center text-muted-foreground">
                        ... and {exportData.length - 5} more records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};