import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  toastTitle?: string;
  onError?: (error: Error) => void;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();
  const { showToast = true, toastTitle = 'Error', onError } = options;

  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    setError(errorMessage);
    
    if (showToast) {
      toast({
        title: toastTitle,
        description: errorMessage,
        variant: 'destructive'
      });
    }

    if (onError && error instanceof Error) {
      onError(error);
    }

    console.error('Error handled:', error);
  }, [toast, showToast, toastTitle, onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback(async (operation: () => Promise<void>) => {
    setIsRetrying(true);
    clearError();
    
    try {
      await operation();
    } catch (error) {
      handleError(error);
    } finally {
      setIsRetrying(false);
    }
  }, [handleError, clearError]);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        clearError();
        return await fn(...args);
      } catch (error) {
        handleError(error);
        return undefined;
      }
    };
  }, [handleError, clearError]);

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry,
    withErrorHandling
  };
};

export type ErrorHandler = ReturnType<typeof useErrorHandler>;