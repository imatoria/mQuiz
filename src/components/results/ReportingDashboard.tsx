import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressReport } from './ProgressReport';
import { ExportManager } from './ExportManager';
import { CustomReports } from './CustomReports';
import { ComparativeAnalysis } from './ComparativeAnalysis';
import { 
  TrendingUp, 
  Download, 
  FileText, 
  BarChart3,
  Users,
  Target
} from 'lucide-react';

export const ReportingDashboard = () => {
  const { tab, subtab } = useParams();
  const navigate = useNavigate();
  
  // Read report subtab from URL or default to 'progress'
  const activeTab = subtab || 'progress';

  // Redirect to default subtab if not set
  useEffect(() => {
    if (tab === 'reports' && !subtab) {
      navigate('/parent/reports/progress', { replace: true });
    }
  }, [tab, subtab, navigate]);

  // Update URL when changing report tabs
  const handleReportTabChange = (value: string) => {
    navigate(`/parent/reports/${value}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Reports & Analytics
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Comprehensive reporting and analysis tools
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleReportTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
          <TabsTrigger value="progress" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Progress</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Download className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Export</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <FileText className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Custom</span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <BarChart3 className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <ProgressReport />
        </TabsContent>

        <TabsContent value="export">
          <ExportManager />
        </TabsContent>

        <TabsContent value="custom">
          <CustomReports />
        </TabsContent>

        <TabsContent value="compare">
          <ComparativeAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
};