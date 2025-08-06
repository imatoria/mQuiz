import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  AlertCircle, 
  FileX, 
  UserX,
  Settings,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  error: string | Error;
  type?: 'network' | 'auth' | 'permission' | 'notfound' | 'generic';
  onRetry?: () => void;
  onGoHome?: () => void;
  onConfigure?: () => void;
  isRetrying?: boolean;
  className?: string;
  showActions?: boolean;
}

const errorConfig = {
  network: {
    icon: Wifi,
    title: 'Connection Error',
    suggestions: [
      'Check your internet connection',
      'Verify the server is running',
      'Try refreshing the page'
    ]
  },
  auth: {
    icon: UserX,
    title: 'Authentication Error',
    suggestions: [
      'Please sign in again',
      'Check your credentials',
      'Contact support if issue persists'
    ]
  },
  permission: {
    icon: AlertCircle,
    title: 'Permission Denied',
    suggestions: [
      'You don\'t have permission for this action',
      'Contact your administrator',
      'Try signing in with a different account'
    ]
  },
  notfound: {
    icon: FileX,
    title: 'Not Found',
    suggestions: [
      'The requested resource was not found',
      'Check the URL or try searching',
      'Go back to the previous page'
    ]
  },
  generic: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    suggestions: [
      'An unexpected error occurred',
      'Try refreshing the page',
      'Contact support if the problem persists'
    ]
  }
};

export const ErrorState = ({
  error,
  type = 'generic',
  onRetry,
  onGoHome,
  onConfigure,
  isRetrying = false,
  className,
  showActions = true
}: ErrorStateProps) => {
  const config = errorConfig[type];
  const Icon = config.icon;
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <Card className={cn('border-destructive', className)}>
      <CardHeader>
        <CardTitle className="flex items-center text-destructive">
          <Icon className="w-5 h-5 mr-2" />
          {config.title}
        </CardTitle>
        <CardDescription>
          {config.suggestions[0]}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {errorMessage}
          </AlertDescription>
        </Alert>

        <div className="space-y-2 text-sm text-muted-foreground">
          <h4 className="font-medium text-foreground">Possible solutions:</h4>
          <ul className="list-disc list-inside space-y-1">
            {config.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>

        {showActions && (
          <div className="flex flex-col sm:flex-row gap-3">
            {onRetry && (
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
                    Try Again
                  </>
                )}
              </Button>
            )}
            
            {onConfigure && (type === 'auth' || type === 'permission') && (
              <Button 
                variant="outline" 
                onClick={onConfigure}
                className="flex-1"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            )}

            {onGoHome && (
              <Button 
                variant="outline" 
                onClick={onGoHome}
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const InlineErrorState = ({ 
  error, 
  onRetry, 
  isRetrying = false,
  className 
}: {
  error: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}) => {
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              'Retry'
            )}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};