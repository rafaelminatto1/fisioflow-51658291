import { useMemo, useCallback, useState } from 'react';
import { useDebounce } from './useDebounce';

interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface FilterOptions<T> {
  searchFields?: (keyof T)[];
  filterFn?: (item: T, searchTerm: string) => boolean;
}

interface UseOptimizedListResult<T> {
  // Dados paginados e filtrados
  items: T[];
  // Total de itens após filtro
  totalItems: number;
  // Total de páginas
  totalPages: number;
  // Página atual (0-indexed)
  currentPage: number;
  // Navegação
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  // Busca
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  // Estado de loading do debounce
  isSearching: boolean;
  // Reset
  reset: () => void;
}

/**
 * Hook para listas otimizadas com paginação, filtro e debounce
 * Melhora performance em listas grandes
 */
export function useOptimizedList<T>(
  data: T[],
  options: PaginationOptions & FilterOptions<T> = {}
): UseOptimizedListResult<T> {
  const { 
    pageSize = 20, 
    initialPage = 0,
    searchFields = [],
    filterFn 
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debounce da busca para não filtrar a cada keystroke
  const debouncedSearch = useDebounce(searchTerm, 300);
  const isSearching = searchTerm !== debouncedSearch;

  // Filtrar dados baseado na busca
  const filteredData = useMemo(() => {
    if (!debouncedSearch) return data;

    const lowerSearch = debouncedSearch.toLowerCase();

    return data.filter((item) => {
      // Custom filter function
      if (filterFn) {
        return filterFn(item, debouncedSearch);
      }

      // Default: search in specified fields
      if (searchFields.length > 0) {
        return searchFields.some((field) => {
          const value = item[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(lowerSearch);
          }
          if (typeof value === 'number') {
            return value.toString().includes(lowerSearch);
          }
          return false;
        });
      }

      // Fallback: search in all string values
      return Object.values(item as object).some((value) => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerSearch);
        }
        return false;
      });
    });
  }, [data, debouncedSearch, searchFields, filterFn]);

  // Calcular paginação
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Garantir que currentPage está dentro dos limites
  const validPage = Math.min(Math.max(0, currentPage), Math.max(0, totalPages - 1));
  
  // Reset page when filter changes
  useMemo(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1);
    }
  }, [currentPage, totalPages]);

  // Paginar dados
  const items = useMemo(() => {
    const start = validPage * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, validPage, pageSize]);

  // Navegação
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.min(Math.max(0, page), totalPages - 1));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setSearchTerm('');
  }, [initialPage]);

  return {
    items,
    totalItems,
    totalPages,
    currentPage: validPage,
    goToPage,
    nextPage,
    prevPage,
    searchTerm,
    setSearchTerm,
    isSearching,
    reset,
  };
}

/**
 * Hook simples para paginação sem filtro
 */
export function usePagination<T>(
  data: T[],
  pageSize: number = 20
): {
  items: T[];
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
} {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(data.length / pageSize);
  const validPage = Math.min(Math.max(0, currentPage), Math.max(0, totalPages - 1));

  const items = useMemo(() => {
    const start = validPage * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, validPage, pageSize]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.min(Math.max(0, page), totalPages - 1));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  return {
    items,
    currentPage: validPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
  };
}
