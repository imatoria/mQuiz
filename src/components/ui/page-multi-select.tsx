import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PageMultiSelectProps {
  label?: string;
  availablePages: number[];
  selectedPages: number[];
  onChange: (pages: number[]) => void;
  disabled?: boolean;
  className?: string;
}

export const PageMultiSelect: React.FC<PageMultiSelectProps> = ({
  label = 'Select Pages',
  availablePages,
  selectedPages,
  onChange,
  disabled,
  className,
}) => {
  const allSelected = availablePages.length > 0 && selectedPages.length === availablePages.length;

  // Pagination/windowing state
  const windowSize = 30;
  const minPage = availablePages.length ? Math.min(...availablePages) : 1;
  const maxPage = availablePages.length ? Math.max(...availablePages) : 0;
  const [start, setStart] = React.useState<number>(minPage);
  React.useEffect(() => {
    setStart(minPage);
  }, [minPage]);
  const end = Math.min(start + windowSize - 1, maxPage || start);
  const canPrev = start > minPage;
  const canNext = end < maxPage;

  const currentWindowPages = availablePages.filter((p) => p >= start && p <= end);
  const allWindowSelected = currentWindowPages.length > 0 && currentWindowPages.every((p) => selectedPages.includes(p));

  const toggleAll = (checked: boolean) => {
    // Toggle only within current window
    if (checked) {
      const merged = new Set([...selectedPages, ...currentWindowPages]);
      onChange(Array.from(merged).sort((a, b) => a - b));
    } else {
      onChange(selectedPages.filter((p) => !currentWindowPages.includes(p)));
    }
  };

  const togglePage = (page: number, checked: boolean) => {
    if (checked) onChange([...new Set([...selectedPages, page])]);
    else onChange(selectedPages.filter((p) => p !== page));
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
  // Sort pages in ascending order
  const sortedCurrentWindowPages = [...currentWindowPages].sort((a, b) => a - b);

  return (
    <Popover>
      <PopoverTrigger asSlot>
        <Button type="button" variant="outline" disabled={disabled} className={cn('justify-between', className)}>
          <span className="truncate">{label}</span>
          <span className="ml-2 text-muted-foreground">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-50 bg-background border shadow-md w-72 p-0">
        <div className="border-b px-3 py-2 text-sm md:text-xs text-muted-foreground">
          <span className="font-medium">Selected:</span> {selectedSummary}
        </div>
        <div className="border-b px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox id="select-all-pages" checked={allWindowSelected} onCheckedChange={(v) => toggleAll(!!v)} />
            <label htmlFor="select-all-pages" className="text-base md:text-sm">Select Window</label>
          </div>
          <div className="text-sm md:text-xs text-muted-foreground">
            {availablePages.length ? `Pages ${start}–${end}` : 'No pages'}
          </div>
        </div>
        <ScrollArea className="max-h-64">
          <div className="grid grid-cols-3 gap-2 p-3">
            {sortedCurrentWindowPages.map((page) => (
              <label key={page} className="flex items-center gap-2 text-base md:text-sm">
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
        <div className="border-t px-3 py-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStart(Math.max(minPage, start - windowSize))}
            disabled={!canPrev}
            aria-label="Previous pages"
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStart(Math.min(Math.max(minPage, maxPage - windowSize + 1), start + windowSize))}
            disabled={!canNext}
            aria-label="Next pages"
          >
            Next
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PageMultiSelect;
