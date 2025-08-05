import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('progress');

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

        <TabsContent value="progress" className="mt-6">
          <ProgressReport />
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <ExportManager />
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <CustomReports />
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          <ComparativeAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
};