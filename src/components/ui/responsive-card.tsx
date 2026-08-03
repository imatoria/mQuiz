import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ResponsiveCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'dashboard';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const ResponsiveCard = ({ 
  children, 
  title, 
  description, 
  className,
  variant = 'default',
  padding = 'md'
}: ResponsiveCardProps) => {
  const variants = {
    default: '',
    compact: 'shadow-sm',
    dashboard: 'h-full flex flex-col'
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2 sm:p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  return (
    <Card className={cn(variants[variant], className)}>
      {(title || description) && (
        <CardHeader className="pb-3 sm:pb-4">
          {title && (
            <CardTitle className="text-lg sm:text-xl leading-tight">
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className="text-sm sm:text-base">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(
        variant === 'dashboard' ? 'flex-1 overflow-hidden' : '',
        paddingClasses[padding]
      )}>
        {variant === 'dashboard' ? (
          <ScrollArea className="h-full">
            {children}
          </ScrollArea>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
};

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveTable = ({ children, className }: ResponsiveTableProps) => {
  return (
    <div className="w-full">
      {/* Mobile: Stack view */}
      <div className="block sm:hidden space-y-3">
        {children}
      </div>
      
      {/* Desktop: Table view */}
      <div className="hidden sm:block overflow-x-auto">
        <div className={cn('min-w-full', className)}>
          {children}
        </div>
      </div>
    </div>
  );
};

interface MobileStackedItemProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileStackedItem = ({ children, className }: MobileStackedItemProps) => {
  return (
    <div className={cn(
      'sm:hidden p-4 border rounded-lg bg-card space-y-2',
      className
    )}>
      {children}
    </div>
  );
};