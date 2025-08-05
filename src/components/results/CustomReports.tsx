import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Settings, 
  Save, 
  FileText, 
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Calendar,
  Target
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  groupBy: string;
  filterBy: string[];
  chartType: string;
  timeRange: string;
}

const predefinedMetrics = [
  { id: 'average_score', label: 'Average Score', icon: Target },
  { id: 'completion_rate', label: 'Completion Rate', icon: TrendingUp },
  { id: 'time_taken', label: 'Average Time Taken', icon: Calendar },
  { id: 'question_accuracy', label: 'Question Accuracy', icon: BarChart3 },
  { id: 'improvement_trend', label: 'Improvement Trend', icon: TrendingUp },
  { id: 'subject_performance', label: 'Subject Performance', icon: PieChart },
  { id: 'difficulty_analysis', label: 'Difficulty Analysis', icon: BarChart3 },
  { id: 'participation_rate', label: 'Participation Rate', icon: Users }
];

const chartTypes = [
  { value: 'line', label: 'Line Chart' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'table', label: 'Data Table' }
];

const groupByOptions = [
  { value: 'student', label: 'By Student' },
  { value: 'subject', label: 'By Subject' },
  { value: 'class', label: 'By Class Level' },
  { value: 'test', label: 'By Test' },
  { value: 'date', label: 'By Date' },
  { value: 'week', label: 'By Week' },
  { value: 'month', label: 'By Month' }
];

export const CustomReports = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([
    {
      id: '1',
      name: 'Student Performance Overview',
      description: 'Comprehensive view of individual student performance',
      metrics: ['average_score', 'completion_rate', 'improvement_trend'],
      groupBy: 'student',
      filterBy: ['date_range', 'subject'],
      chartType: 'bar',
      timeRange: '30'
    },
    {
      id: '2',
      name: 'Subject Analysis',
      description: 'Performance breakdown by subject areas',
      metrics: ['subject_performance', 'difficulty_analysis'],
      groupBy: 'subject',
      filterBy: ['class_level', 'date_range'],
      chartType: 'pie',
      timeRange: '90'
    }
  ]);

  const [newTemplate, setNewTemplate] = useState<Partial<ReportTemplate>>({
    name: '',
    description: '',
    metrics: [],
    groupBy: '',
    filterBy: [],
    chartType: 'bar',
    timeRange: '30'
  });

  const [isCreating, setIsCreating] = useState(false);

  const handleMetricToggle = (metricId: string, checked: boolean) => {
    const currentMetrics = newTemplate.metrics || [];
    if (checked) {
      setNewTemplate({
        ...newTemplate,
        metrics: [...currentMetrics, metricId]
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        metrics: currentMetrics.filter(m => m !== metricId)
      });
    }
  };

  const handleFilterToggle = (filterId: string, checked: boolean) => {
    const currentFilters = newTemplate.filterBy || [];
    if (checked) {
      setNewTemplate({
        ...newTemplate,
        filterBy: [...currentFilters, filterId]
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        filterBy: currentFilters.filter(f => f !== filterId)
      });
    }
  };

  const saveTemplate = () => {
    if (!newTemplate.name || !newTemplate.metrics?.length) return;

    const template: ReportTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      description: newTemplate.description || '',
      metrics: newTemplate.metrics,
      groupBy: newTemplate.groupBy || 'student',
      filterBy: newTemplate.filterBy || [],
      chartType: newTemplate.chartType || 'bar',
      timeRange: newTemplate.timeRange || '30'
    };

    setTemplates([...templates, template]);
    setNewTemplate({
      name: '',
      description: '',
      metrics: [],
      groupBy: '',
      filterBy: [],
      chartType: 'bar',
      timeRange: '30'
    });
    setIsCreating(false);
  };

  const generateReport = (template: ReportTemplate) => {
    // This would generate the actual report based on the template
    console.log('Generating report for template:', template);
    // Implementation would fetch data and create visualization
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Custom Report Templates</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage custom report templates
          </p>
        </div>
        
        <Button 
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Create New Template */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Report Template</CardTitle>
            <CardDescription>
              Configure the metrics and visualization for your custom report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplate.name || ''}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="Enter template name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time-range">Default Time Range</Label>
                <Select 
                  value={newTemplate.timeRange || '30'} 
                  onValueChange={(value) => setNewTemplate({...newTemplate, timeRange: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 3 months</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={newTemplate.description || ''}
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                placeholder="Describe what this report shows"
                rows={3}
              />
            </div>

            {/* Metrics Selection */}
            <div className="space-y-3">
              <Label>Metrics to Include</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {predefinedMetrics.map((metric) => {
                  const IconComponent = metric.icon;
                  return (
                    <div key={metric.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.id}
                        checked={newTemplate.metrics?.includes(metric.id) || false}
                        onCheckedChange={(checked) => handleMetricToggle(metric.id, checked as boolean)}
                      />
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-4 h-4 text-muted-foreground" />
                        <label htmlFor={metric.id} className="text-sm">
                          {metric.label}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grouping and Chart Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Group Data By</Label>
                <Select 
                  value={newTemplate.groupBy || ''} 
                  onValueChange={(value) => setNewTemplate({...newTemplate, groupBy: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grouping" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupByOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chart Type</Label>
                <Select 
                  value={newTemplate.chartType || 'bar'} 
                  onValueChange={(value) => setNewTemplate({...newTemplate, chartType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Options */}
            <div className="space-y-3">
              <Label>Available Filters</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['date_range', 'subject', 'class_level', 'student', 'test_type', 'difficulty'].map((filter) => (
                  <div key={filter} className="flex items-center space-x-2">
                    <Checkbox
                      id={filter}
                      checked={newTemplate.filterBy?.includes(filter) || false}
                      onCheckedChange={(checked) => handleFilterToggle(filter, checked as boolean)}
                    />
                    <label htmlFor={filter} className="text-sm capitalize">
                      {filter.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={saveTemplate} disabled={!newTemplate.name || !newTemplate.metrics?.length}>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Metrics */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">METRICS</Label>
                <div className="flex flex-wrap gap-1">
                  {template.metrics.map((metricId) => {
                    const metric = predefinedMetrics.find(m => m.id === metricId);
                    return (
                      <Badge key={metricId} variant="secondary" className="text-xs">
                        {metric?.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Configuration */}
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Group by:</span>
                  <span className="capitalize">{template.groupBy.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chart type:</span>
                  <span className="capitalize">{template.chartType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time range:</span>
                  <span>{template.timeRange} days</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2">
                <Button 
                  onClick={() => generateReport(template)}
                  className="w-full"
                  size="sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && !isCreating && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Custom Reports</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first custom report template to get started
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
