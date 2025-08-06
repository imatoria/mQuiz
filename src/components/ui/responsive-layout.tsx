import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'dashboard' | 'auth' | 'fullscreen';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const ResponsiveContainer = ({ 
  children, 
  className, 
  variant = 'default',
  padding = 'md'
}: ResponsiveContainerProps) => {
  const variants = {
    default: 'max-w-7xl mx-auto',
    dashboard: 'max-w-[1400px] mx-auto min-h-[calc(100vh-4rem)]',
    auth: 'max-w-md mx-auto min-h-screen flex items-center justify-center',
    fullscreen: 'w-full h-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'p-2 sm:p-4',
    md: 'p-4 sm:p-6 lg:p-8',
    lg: 'p-6 sm:p-8 lg:p-12'
  };

  return (
    <div className={cn(
      variants[variant],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveGrid = ({ 
  children, 
  columns = { default: 1, md: 2, lg: 3 },
  gap = 'md',
  className 
}: ResponsiveGridProps) => {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8'
  };

  const getGridCols = () => {
    const classes = ['grid'];
    
    if (columns.default) classes.push(`grid-cols-${columns.default}`);
    if (columns.sm) classes.push(`sm:grid-cols-${columns.sm}`);
    if (columns.md) classes.push(`md:grid-cols-${columns.md}`);
    if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`);
    if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`);
    
    return classes.join(' ');
  };

  return (
    <div className={cn(
      getGridCols(),
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
};

interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal' | 'responsive';
  spacing?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}

export const ResponsiveStack = ({ 
  children, 
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  className 
}: ResponsiveStackProps) => {
  const spacingClasses = {
    sm: 'space-y-2 sm:space-y-3',
    md: 'space-y-4 sm:space-y-6',
    lg: 'space-y-6 sm:space-y-8'
  };

  const directionClasses = {
    vertical: 'flex flex-col',
    horizontal: 'flex flex-row flex-wrap',
    responsive: 'flex flex-col sm:flex-row'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };

  return (
    <div className={cn(
      directionClasses[direction],
      direction === 'vertical' ? spacingClasses[spacing] : `gap-2 sm:gap-4`,
      alignClasses[align],
      className
    )}>
      {children}
    </div>
  );
};