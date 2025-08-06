import { useState, useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';

interface UseAsyncOperationOptions {
  onSuccess?: (data?: any) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
  successMessage?: string;
}

export const useAsyncOperation = (options: UseAsyncOperationOptions = {}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const { error, handleError, clearError } = useErrorHandler({
    showToast: options.showToast,
    onError: options.onError
  });

  const execute = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | undefined> => {
    setLoading(true);
    clearError();
    
    try {
      const result = await operation();
      setData(result);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      handleError(err);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError, options]);

  const reset = useCallback(() => {
    setLoading(false);
    setData(null);
    clearError();
  }, [clearError]);

  return {
    loading,
    error,
    data,
    execute,
    reset
  };
};

export type AsyncOperation = ReturnType<typeof useAsyncOperation>;