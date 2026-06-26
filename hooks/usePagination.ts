import { useState, useMemo } from 'react';

export function usePagination<T>(data: T[], initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  
  // Ensure current page is valid when data changes
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [data, validCurrentPage, pageSize]);
  
  // Helper to handle page size change and reset to page 1
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };
  
  return {
    paginatedData,
    currentPage: validCurrentPage,
    setCurrentPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    totalItems,
    totalPages
  };
}
