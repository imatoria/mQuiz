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

  const toggleAll = (checked: boolean) => {
    onChange(checked ? [...availablePages] : []);
  };

  const togglePage = (page: number, checked: boolean) => {
    if (checked) onChange([...new Set([...selectedPages, page])]);
    else onChange(selectedPages.filter((p) => p !== page));
  };

  const display = selectedPages.length > 0
    ? `${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''} selected`
    : 'Choose pages';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} className={cn('justify-between', className)}>
          <span className="truncate">{label}</span>
          <span className="ml-2 text-muted-foreground">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-50 bg-background border shadow-md w-64 p-0">
        <div className="border-b px-3 py-2 flex items-center gap-2">
          <Checkbox id="select-all-pages" checked={allSelected} onCheckedChange={(v) => toggleAll(!!v)} />
          <label htmlFor="select-all-pages" className="text-sm">Select All</label>
        </div>
        <ScrollArea className="max-h-64">
          <div className="grid grid-cols-3 gap-2 p-3">
            {availablePages.map((page) => (
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
      </PopoverContent>
    </Popover>
  );
};

export default PageMultiSelect;
