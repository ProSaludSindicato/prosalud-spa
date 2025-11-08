import {useMemo, useState} from 'react';
import {mockEvents} from '@/data/eventosMock';

const ITEMS_PER_PAGE = 12;

export const useEventsData = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc'>('date-desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Generar categorías únicas
  const uniqueCategories = useMemo(() => {
    const categories = new Set(mockEvents.map(event => event.category).filter(Boolean) as string[]);
    return ['all', ...Array.from(categories).sort((a, b) => a.localeCompare(b))];
  }, []);

  // Procesar eventos usando useMemo para evitar cálculos innecesarios
  const processedEvents = useMemo(() => {
    const filtered = mockEvents.filter(event => 
      filterCategory === 'all' || event.category === filterCategory
    );
    
    // Paso 2: Ordenar según el criterio seleccionado
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      if (sortOrder === 'date-desc') {
        return dateB - dateA; // Más recientes primero
      } else {
        return dateA - dateB; // Más antiguos primero
      }
    });
  }, [filterCategory, sortOrder]);

  // Calcular eventos para mostrar en la página actual
  const eventsToDisplay = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return processedEvents.slice(startIndex, endIndex);
  }, [processedEvents, currentPage]);

  const totalPages = Math.ceil(processedEvents.length / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleSortOrderChange = (newOrder: 'date-desc' | 'date-asc') => {
    setSortOrder(newOrder);
    setCurrentPage(1); // Reset a la primera página
    window.scrollTo(0, 0);
  };

  const handleCategoryChange = (newCategory: string) => {
    setFilterCategory(newCategory);
    setCurrentPage(1); // Reset a la primera página
    window.scrollTo(0, 0);
  };

  return {
    currentPage,
    sortOrder,
    setSortOrder: handleSortOrderChange,
    filterCategory,
    setFilterCategory: handleCategoryChange,
    uniqueCategories,
    eventsToDisplay,
    totalPages,
    handlePageChange
  };
};
