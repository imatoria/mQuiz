import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  success: number;
  errors: string[];
  total: number;
}

interface Question {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  difficulty: 'easy' | 'medium' | 'difficult';
  page_number?: number;
  subject_id?: string;
  class_id?: string;
}

export default function BulkQuestionOperations() {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const [importData, setImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const { toast } = useToast();

  const csvTemplate = `question_text,option_a,option_b,option_c,option_d,correct_answer,difficulty,page_number
"What is the capital of France?","Paris","London","Berlin","Madrid","a","easy",1
"What is 2 + 2?","3","4","5","6","b","easy",2`;

  const jsonTemplate = `[
  {
    "question_text": "What is the capital of France?",
    "option_a": "Paris",
    "option_b": "London", 
    "option_c": "Berlin",
    "option_d": "Madrid",
    "correct_answer": "a",
    "difficulty": "easy",
    "page_number": 1
  },
  {
    "question_text": "What is 2 + 2?",
    "option_a": "3",
    "option_b": "4",
    "option_c": "5", 
    "option_d": "6",
    "correct_answer": "b",
    "difficulty": "easy",
    "page_number": 2
  }
]`;

  const handleImport = async () => {
    if (!importData.trim()) {
      toast({
        title: "Error",
        description: "Please provide data to import.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDocumentId) {
      toast({
        title: "Error", 
        description: "Please select pages to associate with the questions.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      let questions: Question[] = [];
      
      if (selectedFormat === 'csv') {
        questions = parseCSV(importData);
      } else {
        questions = JSON.parse(importData);
      }

      // Validate questions
      const errors: string[] = [];
      questions.forEach((q, index) => {
        if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d) {
          errors.push(`Row ${index + 1}: Missing required fields`);
        }
        if (!['a', 'b', 'c', 'd'].includes(q.correct_answer)) {
          errors.push(`Row ${index + 1}: Invalid correct answer (must be a, b, c, or d)`);
        }
        if (!['easy', 'medium', 'difficult'].includes(q.difficulty)) {
          errors.push(`Row ${index + 1}: Invalid difficulty (must be easy, medium, or difficult)`);
        }
      });

      if (errors.length > 0) {
        setImportResult({
          success: 0,
          errors,
          total: questions.length
        });
        return;
      }

      // Add document_id to all questions
      const questionsWithDoc = questions.map(q => ({
        ...q,
        document_id: selectedDocumentId
      }));

      // Insert questions into database
      const { data, error } = await supabase
        .from('questions')
        .insert(questionsWithDoc);

      if (error) throw error;

      setImportResult({
        success: questions.length,
        errors: [],
        total: questions.length
      });

      toast({
        title: "Success",
        description: `Successfully imported ${questions.length} questions.`,
      });

      setImportData('');
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        total: 0
      });
    } finally {
      setIsImporting(false);
    }
  };

  const parseCSV = (csvData: string): Question[] => {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    return lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const question: any = {};
      
      headers.forEach((header, index) => {
        question[header] = values[index]?.replace(/"/g, '').trim() || '';
      });
      
      return question as Question;
    });
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Fetch all questions for the user
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!questions || questions.length === 0) {
        toast({
          title: "No Data",
          description: "No questions found to export.",
          variant: "destructive",
        });
        return;
      }

      let exportData = '';
      const filename = `questions_export_${new Date().toISOString().split('T')[0]}`;

      if (selectedFormat === 'csv') {
        const headers = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'difficulty', 'page_number', 'document_title'];
        exportData = headers.join(',') + '\n';
        
        questions.forEach(q => {
          const row = [
            `"${q.question_text}"`,
            `"${q.option_a}"`,
            `"${q.option_b}"`, 
            `"${q.option_c}"`,
            `"${q.option_d}"`,
            q.correct_answer,
            q.difficulty,
            q.page_number || '',
            '' // No longer using document title
          ];
          exportData += row.join(',') + '\n';
        });
        
        downloadFile(exportData, `${filename}.csv`, 'text/csv');
      } else {
        const exportQuestions = questions.map(q => ({
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty,
          page_number: q.page_number
        }));
        
        exportData = JSON.stringify(exportQuestions, null, 2);
        downloadFile(exportData, `${filename}.json`, 'application/json');
      }

      toast({
        title: "Success",
        description: `Exported ${questions.length} questions successfully.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export questions.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bulk Question Operations</h2>
        <p className="text-muted-foreground">Import and export questions in bulk</p>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="import">Import Questions</TabsTrigger>
          <TabsTrigger value="export">Export Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import Questions
              </CardTitle>
              <CardDescription>
                Upload questions from CSV or JSON format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={selectedFormat} onValueChange={(value: 'csv' | 'json') => setSelectedFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Target Pages</Label>
                  <Input
                    placeholder="Document ID (required)"
                    value={selectedDocumentId}
                    onChange={(e) => setSelectedDocumentId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data to Import</Label>
                <Textarea
                  placeholder={`Paste your ${selectedFormat.toUpperCase()} data here...`}
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={10}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleImport} 
                  disabled={isImporting}
                  className="flex items-center gap-2"
                >
                  {isImporting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Questions
                    </>
                  )}
                </Button>
              </div>

              {importResult && (
                <Card className={importResult.errors.length > 0 ? 'border-destructive' : 'border-green-500'}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.errors.length > 0 ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      <span className="font-medium">
                        Import Result: {importResult.success}/{importResult.total} successful
                      </span>
                    </div>
                    
                    {importResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm text-destructive font-medium">Errors:</p>
                        {importResult.errors.map((error, index) => (
                          <p key={index} className="text-sm text-destructive">• {error}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Template Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Import Template
              </CardTitle>
              <CardDescription>
                Use this template format for importing questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>{selectedFormat.toUpperCase()} Template</Label>
                <Textarea
                  value={selectedFormat === 'csv' ? csvTemplate : jsonTemplate}
                  readOnly
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Field Requirements:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <strong>question_text</strong>: The question text (required)</li>
                  <li>• <strong>option_a/b/c/d</strong>: Answer options (required)</li>
                  <li>• <strong>correct_answer</strong>: Must be 'a', 'b', 'c', or 'd' (required)</li>
                  <li>• <strong>difficulty</strong>: Must be 'easy', 'medium', or 'difficult' (required)</li>
                  <li>• <strong>page_number</strong>: Page reference (optional)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Questions
              </CardTitle>
              <CardDescription>
                Download all your questions in CSV or JSON format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select value={selectedFormat} onValueChange={(value: 'csv' | 'json') => setSelectedFormat(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV Format</SelectItem>
                    <SelectItem value="json">JSON Format</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="flex items-center gap-2"
              >
                {isExporting ? (
                  <>Exporting...</>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export All Questions
                  </>
                )}
              </Button>

              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Export Information:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• All your questions will be included in the export</li>
                  <li>• Page titles will be included for reference</li>
                  <li>• File will be automatically downloaded to your device</li>
                  <li>• CSV format is good for spreadsheet applications</li>
                  <li>• JSON format is good for technical integrations</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}