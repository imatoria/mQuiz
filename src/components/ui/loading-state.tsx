import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingState = ({ 
  variant = 'spinner', 
  size = 'md', 
  text = 'Loading...',
  className 
}: LoadingStateProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  if (variant === 'spinner') {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('animate-pulse space-y-4', className)}>
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
      <div className="h-4 bg-muted rounded w-full"></div>
    </div>
  );
};

export const LoadingCard = ({ 
  title = 'Loading', 
  description,
  variant = 'spinner',
  className 
}: {
  title?: string;
  description?: string;
  variant?: 'spinner' | 'skeleton';
  className?: string;
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {variant === 'spinner' && <Loader2 className="h-4 w-4 animate-spin" />}
          <Skeleton className="h-5 w-24" />
        </div>
        {description && <Skeleton className="h-4 w-48" />}
      </CardHeader>
      <CardContent>
        <LoadingState variant={variant} />
      </CardContent>
    </Card>
  );
};

export const TableLoadingSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};