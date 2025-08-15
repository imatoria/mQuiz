
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
  disabledPages?: number[]; // pages that should be disabled (already used)
  maxSelectable?: number; // maximum number of pages that can be selected
  onLimitExceeded?: () => void; // callback when selection exceeds maxSelectable
}

export const PaginatedPageMultiSelect: React.FC<PaginatedPageMultiSelectProps> = ({
  label = 'Select Pages',
  availablePages,
  selectedPages,
  onChange,
  disabled,
  className,
  pagesPerView = 15,
  disabledPages = [],
  maxSelectable,
  onLimitExceeded,
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  const totalPages = availablePages.length;
  const lastPageIndex = Math.max(0, Math.ceil(totalPages / pagesPerView) - 1);
  const startIndex = Math.max(0, currentPageIndex) * pagesPerView;
  const currentViewPages: number[] = availablePages.slice(startIndex, startIndex + pagesPerView);
  
  const disabledSet = new Set(disabledPages);
  const enabledPages = availablePages.filter((p) => !disabledSet.has(p));
  const allSelected = enabledPages.length > 0 && enabledPages.every((p) => selectedPages.includes(p));

const toggleAll = (checked: boolean) => {
  if (!checked) {
    onChange([]);
    return;
  }
  const toAdd = enabledPages;
  if (maxSelectable !== undefined) {
    const union = Array.from(new Set([...selectedPages, ...toAdd]));
    if (union.length > maxSelectable) {
      onLimitExceeded?.();
      return;
    }
    onChange(union);
  } else {
    onChange([...toAdd]);
  }
};

const togglePage = (page: number, checked: boolean) => {
  if (disabledSet.has(page)) return;
  if (checked) {
    if (maxSelectable !== undefined && !selectedPages.includes(page) && selectedPages.length >= maxSelectable) {
      onLimitExceeded?.();
      return;
    }
    onChange([...new Set([...selectedPages, page])]);
  } else {
    onChange(selectedPages.filter((p) => p !== page));
  }
};
  const goToPrevious = () => {
    setCurrentPageIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentPageIndex((prev) => Math.min(lastPageIndex, prev + 1));
  };
const display = selectedPages.length > 0
  ? `${selectedPages.length}${maxSelectable ? `/${maxSelectable}` : ''} selected`
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
        <div className="border-b px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium">Selected:</span> {selectedSummary}
        </div>
        <ScrollArea className="max-h-64">
          <div className="grid grid-cols-3 gap-2 p-3">
            {currentViewPages.map((page) => {
              const isDisabled = disabledSet.has(page);
              return (
                <label key={page} className={cn('flex items-center gap-2 text-sm', isDisabled && 'opacity-50 cursor-not-allowed')}>
                  <Checkbox
                    id={`page-${page}`}
                    checked={selectedPages.includes(page)}
                    onCheckedChange={(v) => togglePage(page, !!v)}
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                  />
                  <span>Page {page}</span>
                </label>
              );
            })}
          </div>
        </ScrollArea>

          <div className="border-t px-3 py-2 flex items-center justify-between">
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
              disabled={currentPageIndex >= lastPageIndex}
              aria-label="Next pages"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        {totalPages > 0 && selectedPages.length === totalPages && (
          <div className="px-3 pt-2 text-xs text-destructive">
            You have selected all available pages. Please select only the required pages.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default PaginatedPageMultiSelect;
