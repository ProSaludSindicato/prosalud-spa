
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { searchData, SearchItem } from '@/data/searchData';

interface GlobalSearchProps {
  className?: string;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState<SearchItem[]>([]);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter results based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = searchData.filter(item => {
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query)
      );
    });

    setFilteredResults(results.slice(0, 8)); // Limit to 8 results
  }, [searchQuery]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (item: SearchItem) => {
    navigate(item.path);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full max-w-xs lg:max-w-sm xl:max-w-md justify-start text-text-gray border-gray-300 bg-white hover:bg-gray-50 hover:border-primary-prosalud hover:text-gray-500 transition-all duration-200"
      >
        <Search size={16} className="mr-2 text-gray-500" />
        <span className="sm:inline text-sm">Buscar en el sitio...</span>
        <kbd className="lg:inline-flex ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-gray-600">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-[8vh] px-4"
          onClick={(e) => {
            // Cerrar al hacer click fuera del contenido del modal
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-auto max-h-[75vh] overflow-hidden border border-gray-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button in top right corner */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="absolute top-3 right-3 z-10 h-8 w-8 p-0 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </Button>
            
            <Command shouldFilter={false} className="rounded-xl w-full max-w-4xl mx-auto">
              <div className="flex items-center border-b border-gray-200 px-4 py-3 pr-14">
                <CommandInput
                  placeholder="Buscar páginas, servicios o información..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="flex h-12 w-full min-w-[500px] rounded-md bg-transparent text-base outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <CommandList className="max-h-[55vh] overflow-y-auto">
                {searchQuery.trim() === '' ? (
                  <div className="py-12 text-center text-gray-500">
                    <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-lg font-medium mb-2">Buscar en ProSalud</p>
                    <p className="text-sm">Escribe para buscar páginas, servicios e información</p>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <CommandEmpty className="py-12 text-center">
                    <div className="text-gray-500">
                      <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium mb-2">Sin resultados</p>
                      <p className="text-sm">No se encontraron resultados para "<span className="font-medium text-gray-700">{searchQuery}</span>"</p>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    <div className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                      Resultados ({filteredResults.length})
                    </div>
                    <div className="p-2">
                      {filteredResults.map((item) => (
                        <CommandItem
                          key={item.id}
                          onSelect={() => handleSelect(item)}
                          className="cursor-pointer rounded-lg p-3 hover:bg-primary-prosalud border border-transparent hover:border-primary-prosalud transition-all duration-200 mb-2 group"
                        >
                          <div className="flex flex-col w-full">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900 group-hover:text-white text-base transition-colors">{item.title}</span>
                              <span className="text-xs font-medium text-white bg-primary-prosalud group-hover:bg-white group-hover:text-primary-prosalud px-2 py-1 rounded-full transition-colors">
                                {item.category}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600 group-hover:text-white leading-relaxed transition-colors">
                              {item.description}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </div>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
