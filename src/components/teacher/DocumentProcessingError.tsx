import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Settings, RefreshCw, ExternalLink } from 'lucide-react';

interface DocumentProcessingErrorProps {
  error: string;
  onRetry: () => void;
  onConfigureAPIKeys: () => void;
  isRetrying?: boolean;
}

export const DocumentProcessingError = ({ 
  error, 
  onRetry, 
  onConfigureAPIKeys, 
  isRetrying = false 
}: DocumentProcessingErrorProps) => {
  const isAPIKeyError = error.toLowerCase().includes('api key') || 
                       error.toLowerCase().includes('unauthorized') ||
                       error.toLowerCase().includes('authentication');

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center text-destructive">
          <AlertCircle className="w-5 h-5 mr-2" />
          Pages Processing Failed
        </CardTitle>
        <CardDescription>
          There was an issue processing your pages. Please review the error and try again.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>

        {isAPIKeyError && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              This error is likely related to API key configuration. Please check your AI provider settings.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={onRetry} 
            disabled={isRetrying}
            className="flex-1"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Processing
              </>
            )}
          </Button>
          
          {isAPIKeyError && (
            <Button 
              variant="outline" 
              onClick={onConfigureAPIKeys}
              className="flex-1"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure API Keys
            </Button>
          )}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <h4 className="font-medium text-foreground">Common Solutions:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Ensure your AI provider API key is valid and has sufficient credits</li>
            <li>Check that the file is a valid PDF format</li>
            <li>Verify your internet connection is stable</li>
            <li>Try uploading a smaller file if the file is very large</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};