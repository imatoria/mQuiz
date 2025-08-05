import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useState } from 'react';

export const InstallPrompt = () => {
  const { isInstallable, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isDismissed) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 shadow-elegant">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Install QuizMaster</h3>
              <p className="text-xs text-muted-foreground">
                Install the app for better experience and offline access
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button 
            onClick={installApp} 
            size="sm" 
            className="flex-1"
          >
            Install
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsDismissed(true)}
          >
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};