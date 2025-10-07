import { useState, useMemo } from 'react';

interface UsePaginationProps<T> {
  data: T[];
  itemsPerPage?: number;
  onItemsPerPageChange?: (value: number) => void;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  paginatedData: T[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  startItem: number;
  endItem: number;
  totalItems: number;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
}

export function usePagination<T>({ 
  data, 
  itemsPerPage = 10,
  onItemsPerPageChange 
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentItemsPerPage, setCurrentItemsPerPage] = useState(itemsPerPage);

  const totalPages = Math.ceil(data.length / currentItemsPerPage);
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * currentItemsPerPage;
    const endIndex = startIndex + currentItemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, currentItemsPerPage]);

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    goToPage(currentPage + 1);
  };

  const previousPage = () => {
    goToPage(currentPage - 1);
  };

  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  const startItem = data.length === 0 ? 0 : (currentPage - 1) * currentItemsPerPage + 1;
  const endItem = Math.min(currentPage * currentItemsPerPage, data.length);

  const setItemsPerPage = (value: number) => {
    setCurrentItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
    onItemsPerPageChange?.(value);
  };

  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    previousPage,
    canGoNext,
    canGoPrevious,
    startItem,
    endItem,
    totalItems: data.length,
    itemsPerPage: currentItemsPerPage,
    setItemsPerPage,
  };
}