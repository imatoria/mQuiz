
import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginatedPageMultiSelectProps {
  label?: string;
  availablePages: number[];
  selectedPages: number[];
  onChange: (pages: number[]) => void;
  disabled?: boolean;
  className?: string;
  pagesPerView?: number;
}

export const PaginatedPageMultiSelect: React.FC<PaginatedPageMultiSelectProps> = ({
  label = 'Select Pages',
  availablePages,
  selectedPages,
  onChange,
  disabled,
  className,
  pagesPerView = 15,
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  const totalPages = availablePages.length;
  const totalViews = Math.ceil(totalPages / pagesPerView);
  const startIndex = currentPageIndex * pagesPerView;
  const endIndex = Math.min(startIndex + pagesPerView, totalPages);
  const currentViewPages = availablePages.slice(startIndex, endIndex);
  
  const allSelected = availablePages.length > 0 && selectedPages.length === availablePages.length;
  const currentViewAllSelected = currentViewPages.length > 0 && 
    currentViewPages.every(page => selectedPages.includes(page));

  const toggleAll = (checked: boolean) => {
    onChange(checked ? [...availablePages] : []);
  };

  const toggleCurrentView = (checked: boolean) => {
    if (checked) {
      const newSelected = [...new Set([...selectedPages, ...currentViewPages])];
      onChange(newSelected);
    } else {
      const newSelected = selectedPages.filter(page => !currentViewPages.includes(page));
      onChange(newSelected);
    }
  };

  const togglePage = (page: number, checked: boolean) => {
    if (checked) onChange([...new Set([...selectedPages, page])]);
    else onChange(selectedPages.filter((p) => p !== page));
  };

  const goToPrevious = () => {
    setCurrentPageIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentPageIndex((prev) => Math.min(totalViews - 1, prev + 1));
  };
  const display = selectedPages.length > 0
    ? `${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''} selected`
    : 'Choose pages';

  const formatPageRanges = (pages: number[]) => {
    if (!pages || pages.length === 0) return 'None';
    const sorted = [...new Set(pages)].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const p = sorted[i];
      if (p === end + 1) end = p;
      else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = end = p;
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(', ');
  };

  const selectedSummary = formatPageRanges(selectedPages);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className={cn('justify-between', className)}>
          <span className="truncate">{label}</span>
          <span className="ml-2 text-muted-foreground">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-50 bg-background border shadow-md w-80 p-0">
        <div className="border-b px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="select-all-pages" 
              checked={allSelected} 
              onCheckedChange={(v) => toggleAll(!!v)} 
            />
            <label htmlFor="select-all-pages" className="text-sm">Select All ({totalPages})</label>
          </div>
          {totalViews > 1 && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                onMouseDown={(e) => e.preventDefault()}
                disabled={currentPageIndex === 0}
                className="h-6 w-6 p-0"
                aria-label="Previous pages"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {currentPageIndex + 1}/{totalViews}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goToNext}
                onMouseDown={(e) => e.preventDefault()}
                disabled={currentPageIndex === totalViews - 1}
                className="h-6 w-6 p-0"
                aria-label="Next pages"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        {totalViews > 1 && (
          <div className="border-b px-3 py-2 flex items-center gap-2">
            <Checkbox 
              id="select-current-view" 
              checked={currentViewAllSelected} 
              onCheckedChange={(v) => toggleCurrentView(!!v)} 
            />
            <label htmlFor="select-current-view" className="text-sm">
              Select Current View ({startIndex + 1}-{endIndex})
            </label>
          </div>
        )}
        
        <ScrollArea className="max-h-64">
          <div className="grid grid-cols-3 gap-2 p-3">
            {currentViewPages.map((page) => (
              <label key={page} className="flex items-center gap-2 text-sm">
                <Checkbox
                  id={`page-${page}`}
                  checked={selectedPages.includes(page)}
                  onCheckedChange={(v) => togglePage(page, !!v)}
                />
                <span>Page {page}</span>
              </label>
            ))}
          </div>
        </ScrollArea>

          <div className="border-t px-3 py-2 flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              onMouseDown={(e) => e.preventDefault()}
              disabled={currentPageIndex === 0}
              aria-label="Previous pages"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goToNext}
              onMouseDown={(e) => e.preventDefault()}
              disabled={currentPageIndex === totalViews - 1}
              aria-label="Next pages"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        <div className="px-3 pb-3 text-xs text-muted-foreground">
          <span className="font-medium">Selected:</span> {selectedSummary}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PaginatedPageMultiSelect;
