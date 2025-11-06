
import { useState, useMemo, useCallback, useEffect } from 'react';

interface UsePaginationProps<T> {
  data: T[];
  initialItemsPerPage?: number;
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;
  paginatedData: T[];
  goToPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const usePagination = <T>({
  data,
  initialItemsPerPage = 10,
  initialPage = 1
}: UsePaginationProps<T>): UsePaginationReturn<T> => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Reset to page 1 if current page is out of range when data changes
  useEffect(() => {
    if (totalPages > 0) {
      setCurrentPage((prevPage) => {
        // Reset to page 1 if current page is out of range
        return prevPage > totalPages ? 1 : prevPage;
      });
    }
  }, [totalPages]); // Only depend on totalPages to avoid loops

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage((prevPage) => {
      const validPage = Math.max(1, Math.min(page, totalPages || 1));
      return validPage;
    });
  }, [totalPages]);

  const setItemsPerPage = useCallback((items: number) => {
    setItemsPerPageState(items);
    // Reset to first page when changing items per page
    setCurrentPage(1);
  }, []);

  const goToFirstPage = useCallback(() => setCurrentPage(1), []);
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    setItemsPerPage,
    goToFirstPage,
    goToLastPage,
    hasNextPage,
    hasPreviousPage
  };
};
